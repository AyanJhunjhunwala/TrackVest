import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCcw, 
  Lightbulb, 
  Target,
  CheckCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

const TutorialSystem = ({ 
  darkMode, 
  onRefreshEncourage, 
  hasUserRefreshed = false,
  isVisible = true,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(false);

  // Tutorial steps
  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Welcome to TrackVest!',
      content: 'Let\'s take a quick tour to help you get the most out of your portfolio tracker.',
      target: null,
      position: 'center',
      icon: <Lightbulb className="h-6 w-6" />,
      action: null
    },
    {
      id: 'refresh-button',
      title: 'Keep Your Data Fresh',
      content: 'Click the Refresh button to update your portfolio with the latest market prices. This is especially important for accurate tracking!',
      target: '[data-tutorial="refresh-button"]',
      position: 'bottom',
      icon: <RefreshCcw className="h-6 w-6" />,
      action: 'refresh',
      highlight: true
    },
    {
      id: 'portfolio-overview',
      title: 'Portfolio Overview',
      content: 'Here you can see your total portfolio value, performance charts, and asset allocation at a glance.',
      target: '[data-tutorial="overview-cards"]',
      position: 'bottom',
      icon: <Target className="h-6 w-6" />,
      action: null
    },
    {
      id: 'add-investments',
      title: 'Add Your Investments',
      content: 'Use the + button to create custom investment categories or add stocks and crypto to track.',
      target: '[data-tutorial="add-button"]',
      position: 'left',
      icon: <Target className="h-6 w-6" />,
      action: null
    },
    {
      id: 'charts-insights',
      title: 'Analyze Your Performance',
      content: 'Explore the Insights tab for detailed analytics, risk metrics, and AI-powered investment insights.',
      target: '[data-tutorial="insights-tab"]',
      position: 'bottom',
      icon: <Target className="h-6 w-6" />,
      action: null
    }
  ];

  // Quick tips for experienced users
  const quickTips = [
    {
      id: 'refresh-tip',
      title: 'Pro Tip: Regular Refreshes',
      content: 'Refresh your data regularly to get the most accurate portfolio tracking and performance metrics.',
      icon: <RefreshCcw className="h-5 w-5" />,
      action: () => onRefreshEncourage?.()
    },
    {
      id: 'keyboard-tip',
      title: 'Keyboard Shortcut',
      content: 'Press Ctrl+R (Cmd+R on Mac) to quickly refresh your portfolio data.',
      icon: <Target className="h-5 w-5" />,
      action: null
    },
    {
      id: 'api-tip',
      title: 'Live Data',
      content: 'Add your API keys in Settings to get real-time market data instead of demo data.',
      icon: <Lightbulb className="h-5 w-5" />,
      action: null
    }
  ];

  // Check if tutorial should be shown
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    const tutorialDisabled = localStorage.getItem('tutorialDisabled');
    
    if (!hasSeenTutorial && !tutorialDisabled && isVisible) {
      setIsActive(true);
    }
  }, [isVisible]);

  // Show refresh prompt if user hasn't refreshed
  useEffect(() => {
    if (!hasUserRefreshed && !showRefreshPrompt) {
      const timer = setTimeout(() => {
        setShowRefreshPrompt(true);
      }, 10000); // Show after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [hasUserRefreshed, showRefreshPrompt]);

  // Handle tutorial navigation
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTutorial = () => {
    setIsActive(false);
    setTutorialCompleted(true);
    localStorage.setItem('hasSeenTutorial', 'true');
    
    // Show quick tips after tutorial
    setTimeout(() => {
      setShowQuickTips(true);
    }, 1000);
  };

  const skipTutorial = () => {
    setIsActive(false);
    localStorage.setItem('hasSeenTutorial', 'true');
    onClose?.();
  };

  const disableTutorial = () => {
    localStorage.setItem('tutorialDisabled', 'true');
    setIsActive(false);
    onClose?.();
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
    setTutorialCompleted(false);
  };

  // Refresh encouragement component
  const RefreshPrompt = () => (
    <AnimatePresence>
      {showRefreshPrompt && !hasUserRefreshed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border ${
            darkMode 
              ? 'bg-slate-800 border-slate-600 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
            }`}>
              <RefreshCcw className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Keep Your Data Fresh!</h4>
              <p className="text-sm opacity-80 mb-3">
                Click the Refresh button to get the latest market prices for your investments.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onRefreshEncourage?.();
                    setShowRefreshPrompt(false);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  Refresh Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRefreshPrompt(false)}
                >
                  Later
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowRefreshPrompt(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Tutorial overlay component
  const TutorialOverlay = () => {
    const currentStepData = tutorialSteps[currentStep];
    
    return (
      <AnimatePresence>
        {isActive && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
            />
            
            {/* Tutorial Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full mx-4 p-6 rounded-xl shadow-xl ${
                darkMode 
                  ? 'bg-slate-800 border-slate-600 text-white' 
                  : 'bg-white border-slate-200 text-slate-800'
              } border`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${
                  darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                }`}>
                  {currentStepData.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
                  <p className="text-sm opacity-70">
                    Step {currentStep + 1} of {tutorialSteps.length}
                  </p>
                </div>
              </div>
              
              <p className="mb-6 opacity-90">{currentStepData.content}</p>
              
              {/* Progress bar */}
              <div className={`w-full h-2 rounded-full mb-6 ${
                darkMode ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                <div 
                  className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipTutorial}
                  >
                    Skip Tour
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disableTutorial}
                    className="text-xs"
                  >
                    Don't Show Again
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevStep}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {currentStep === tutorialSteps.length - 1 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  // Quick tips component
  const QuickTips = () => (
    <AnimatePresence>
      {showQuickTips && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className={`fixed top-20 right-4 z-40 max-w-sm p-4 rounded-lg shadow-lg border ${
            darkMode 
              ? 'bg-slate-800 border-slate-600 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Quick Tips
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowQuickTips(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {quickTips.map((tip, index) => (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg ${
                  darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="text-emerald-500 mt-0.5">
                    {tip.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{tip.title}</h5>
                    <p className="text-xs opacity-80 mt-1">{tip.content}</p>
                    {tip.action && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={tip.action}
                        className="mt-2 h-6 text-xs"
                      >
                        Try it
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
            <Button
              size="sm"
              variant="ghost"
              onClick={restartTutorial}
              className="w-full text-xs"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restart Tutorial
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Tutorial completion celebration
  const CompletionCelebration = () => (
    <AnimatePresence>
      {tutorialCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        >
          <div className={`p-6 rounded-xl shadow-xl text-center ${
            darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
          }`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="font-bold text-xl mb-2">Tutorial Complete!</h3>
            <p className="opacity-80 mb-4">
              You're all set to start tracking your investments like a pro!
            </p>
            <Button
              onClick={() => setTutorialCompleted(false)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Start Investing!
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <TutorialOverlay />
      <RefreshPrompt />
      <QuickTips />
      <CompletionCelebration />
    </>
  );
};

export default TutorialSystem; 