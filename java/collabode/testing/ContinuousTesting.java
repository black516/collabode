package collabode.testing;

import java.io.IOException;
import java.net.URL;
import java.util.Collections;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.eclipse.core.resources.IProject;
import org.eclipse.core.resources.ResourcesPlugin;
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.debug.core.*;
import org.eclipse.jdt.core.IJavaProject;
import org.eclipse.jdt.core.JavaCore;
import org.eclipse.jdt.junit.JUnitCore;
import org.eclipse.jdt.junit.TestRunListener;
import org.eclipse.jdt.junit.model.ITestCaseElement;
import org.eclipse.jdt.junit.model.ITestRunSession;
import org.eclipse.jdt.launching.IJavaLaunchConfigurationConstants;

import collabode.Application;

public class ContinuousTesting implements Runnable {
    
    private static final ContinuousTesting TESTER = new ContinuousTesting();
    
    /**
     * The continuous testing driver. Must be {@link Thread#start()}ed.
     */
    public static ContinuousTesting getTester() {
        return TESTER;
    }
    
    private final BlockingQueue<IProject> toRun = new LinkedBlockingQueue<IProject>();
    private final BlockingQueue<ILaunch> done = new LinkedBlockingQueue<ILaunch>();
    
    private ContinuousTesting() {
        DebugPlugin.getDefault().getLaunchManager().addLaunchListener(new ILaunchesListener2() {
            public void launchesRemoved(ILaunch[] launches) { }
            public void launchesAdded(ILaunch[] launches) { }
            public void launchesChanged(ILaunch[] launches) { }
            public void launchesTerminated(ILaunch[] launches) {
                for (ILaunch launch : launches) {
                    done.add(launch);
                }
            }
        });
        JUnitCore.addTestRunListener(new TestRunListener() {
            @Override public void testCaseFinished(ITestCaseElement elt) {
                ProjectTestsOwner.of(elt.getTestRunSession().getLaunchedProject()).update(elt);
            }
            @Override public void sessionStarted(ITestRunSession session) {
                ProjectTestsOwner.of(session.getLaunchedProject()).update(session);
            }
        });
    }
    
    /**
     * Schedule test execution for the given project.
     */
    public void runTests(IProject project) {
        toRun.add(project);
    }
    
    public void run() {
        try {
            while (true) {
                IProject project = toRun.take();
                
                Job.getJobManager().join(ResourcesPlugin.FAMILY_AUTO_BUILD, null);
                IJavaProject javaProject = JavaCore.create(project);
                if (JUnitCore.findTestTypes(javaProject, null).length == 0) {
                    ProjectTestsOwner.of(javaProject).empty();
                    continue;
                }
                
                toRun.removeAll(Collections.singleton(project));
                
                try {
                    ILaunch launch = launch(javaProject);
                    awaitTermination(launch);
                } catch (CoreException ce) {
                    ce.printStackTrace(); // XXX
                }
            }
        } catch (Exception e) {
            e.printStackTrace(); // XXX
        }
    }
    
    private ILaunch launch(IJavaProject project) throws CoreException, IOException, InterruptedException {
        ILaunchManager mgr = DebugPlugin.getDefault().getLaunchManager();
        ILaunchConfigurationType type = mgr.getLaunchConfigurationType("org.eclipse.jdt.junit.launchconfig");
        ILaunchConfigurationWorkingCopy config = type.newInstance(null, "Continuous Test: " + project.getElementName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_PROJECT_NAME, project.getElementName());
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_MAIN_TYPE_NAME, "");
        config.setAttribute("org.eclipse.jdt.junit.KEEPRUNNING_ATTR", false);
        config.setAttribute("org.eclipse.jdt.junit.CONTAINER", project.getHandleIdentifier());
        config.setAttribute("org.eclipse.jdt.junit.TEST_KIND", "org.eclipse.jdt.junit.loader.junit4");
        
        // XXX this doesn't work for tests
        URL policyUrl = Application.BUNDLE.getResource("config/security.policy");
        String policy = "'" + FileLocator.toFileURL(policyUrl).getPath() + "'";
        config.setAttribute(IJavaLaunchConfigurationConstants.ATTR_VM_ARGUMENTS,
                "-Dorg.eclipse.osgi.framework.internal.core.FrameworkSecurityManager -Djava.security.policy=" + policy + " -ea");
        
        return config.launch(ILaunchManager.RUN_MODE, null);
    }
    
    private void awaitTermination(ILaunch target) throws InterruptedException {
        ILaunch launch = done.poll(1, TimeUnit.MINUTES);
        if (launch == null) {
            throw new InterruptedException("launch took too long"); // XXX actually, terminate it
        } else if ( ! target.equals(launch)) {
            throw new InterruptedException("what happened here?"); // XXX shouldn't happen until launches are ||ized
        }
    }
}
