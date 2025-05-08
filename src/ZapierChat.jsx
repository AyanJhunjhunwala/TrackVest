import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  formatPortfolioData, 
  createPortfolioSummaryText, 
  injectPortfolioDataToDOM 
} from './utils/portfolioDataFormatter';
import { getDirectiveWithData, getDirectiveScript } from './zapierDirective';

export default function ZapierChat({ darkMode, positions = [], realEstateHoldings = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const chatbotRef = useRef(null);
  
  // Format portfolio data using our utility function
  const portfolioData = formatPortfolioData(positions, realEstateHoldings);
  
  // Create a human-readable text summary
  const portfolioSummaryText = createPortfolioSummaryText(portfolioData);
  
  // Get chatbot directive with real data
  const chatbotDirective = getDirectiveWithData(portfolioData);
  
  // Serialize data for Zapier
  const serializedData = JSON.stringify(portfolioData);
  
  // Load the Zapier script and inject portfolio data
  useEffect(() => {
    // Set up data injection
    const { cleanup } = injectPortfolioDataToDOM(portfolioData);
    
    // Create a hidden script element with the directive
    const directiveScriptElement = document.createElement('div');
    directiveScriptElement.id = 'trackvest-directive-container';
    directiveScriptElement.style.display = 'none';
    directiveScriptElement.innerHTML = getDirectiveScript(portfolioData);
    document.body.appendChild(directiveScriptElement);
    
    // Load the Zapier script
    const script = document.createElement('script');
    script.src = 'https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js';
    script.type = 'module';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      
      // Create a custom event to notify Zapier when data is available
      const event = new CustomEvent('trackvestDataLoaded', { 
        detail: { 
          portfolioData,
          portfolioSummaryText,
          directive: chatbotDirective,
          timestamp: new Date().toISOString()
        } 
      });
      document.dispatchEvent(event);
      
      // Also dispatch periodic data refresh events
      const intervalId = setInterval(() => {
        const refreshEvent = new CustomEvent('trackvestDataRefresh', { 
          detail: { 
            portfolioData, 
            portfolioSummaryText,
            directive: chatbotDirective,
            timestamp: new Date().toISOString() 
          } 
        });
        document.dispatchEvent(refreshEvent);
      }, 60000); // Every minute
      
      return () => clearInterval(intervalId);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (document.body.contains(directiveScriptElement)) {
        document.body.removeChild(directiveScriptElement);
      }
      // Clean up our injected data
      cleanup();
    };
  }, [portfolioData, portfolioSummaryText, chatbotDirective]); // Re-run when data changes
  
  // Animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.03 },
    tap: { scale: 0.97 }
  };
  
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 400,
        duration: 0.4 
      }
    },
    exit: { 
      opacity: 0, 
      y: -30, 
      transition: { duration: 0.2 } 
    }
  };
  
  // Function to inject data into chatbot if it's already loaded
  const injectData = () => {
    if (chatbotRef.current && isOpen) {
      try {
        // Try multiple approaches to pass data to the embedded chatbot
        const chatbotElement = chatbotRef.current.querySelector('zapier-interfaces-chatbot-embed');
        if (chatbotElement) {
          chatbotElement.setAttribute('data-portfolio', serializedData);
          chatbotElement.setAttribute('data-context', serializedData);
          chatbotElement.setAttribute('data-summary-text', portfolioSummaryText);
          chatbotElement.setAttribute('data-directive', chatbotDirective);
          
          // Try to access shadowDOM if available
          if (chatbotElement.shadowRoot) {
            const shadowRoot = chatbotElement.shadowRoot;
            const dataContainer = document.createElement('div');
            dataContainer.id = 'trackvest-portfolio-inject';
            dataContainer.setAttribute('data-portfolio', serializedData);
            dataContainer.setAttribute('data-directive', chatbotDirective);
            dataContainer.style.display = 'none';
            shadowRoot.appendChild(dataContainer);
            
            // Also try to inject the directive script into the shadow DOM
            const directiveScript = document.createElement('script');
            directiveScript.id = 'trackvest-directive-script';
            directiveScript.type = 'application/json';
            directiveScript.textContent = JSON.stringify({ directive: chatbotDirective });
            shadowRoot.appendChild(directiveScript);
          }
        }
      } catch (err) {
        console.error('Error injecting data into chatbot:', err);
      }
    }
  };
  
  // Effect to inject data when chatbot opens
  useEffect(() => {
    if (isOpen) {
      // Slight delay to ensure chatbot is rendered
      const timer = setTimeout(() => {
        injectData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, serializedData, portfolioSummaryText, chatbotDirective]);

  return (
    <>
      <div className="fixed top-3 left-1/2 transform -translate-x-1/2 z-[100]">
        {/* Smaller, more professional button */}
        <motion.div
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          variants={buttonVariants}
        >
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={`
              ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'} 
              rounded-full px-4 py-2 flex items-center gap-2 shadow-sm
              transition-all duration-200 h-auto
            `}
          >
            {isOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <>
                <MessageSquare className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className="text-sm font-medium">Portfolio Assistant</span>
              </>
            )}
          </Button>
        </motion.div>
      </div>
      
      {/* Zapier chatbot with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[101]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            ref={chatbotRef}
          >
            <div className={`
              ${darkMode ? 'shadow-slate-900/20' : 'shadow-slate-400/30'} 
              rounded-lg shadow-lg overflow-hidden
              border ${darkMode ? 'border-slate-700' : 'border-slate-200'}
            `}>
              {/* Hidden div with data */}
              <div id="trackvest-data" style={{display: 'none'}}>
                <div data-portfolio={serializedData}></div>
                <pre id="portfolio-summary" style={{display: 'none'}}>{portfolioSummaryText}</pre>
                <pre id="portfolio-directive" style={{display: 'none'}}>{chatbotDirective}</pre>
              </div>
              
              {/* Hidden inputs for data - sometimes web components can access this */}
              <input type="hidden" name="portfolio-data" value={serializedData} />
              <input type="hidden" name="portfolio-summary" value={portfolioSummaryText} />
              <input type="hidden" name="portfolio-directive" value={chatbotDirective} />
              
              {/* JSON data script tag that Zapier might be able to parse */}
              <script type="application/json" id="trackvest-portfolio-data">
                {serializedData}
              </script>
              
              {/* Directive script tag */}
              <script type="application/json" id="trackvest-directive-data">
                {JSON.stringify({ directive: chatbotDirective })}
              </script>
              
              {/* The actual Zapier chatbot embed */}
              <zapier-interfaces-chatbot-embed 
                is-popup='false' 
                chatbot-id='cmaezkir4002m7ovz0t4xiani' 
                height='600px' 
                width='400px'
                data-portfolio={serializedData}
                data-context={serializedData}
                data-trackvest-portfolio={serializedData}
                data-stocks={JSON.stringify(portfolioData.stocks)}
                data-crypto={JSON.stringify(portfolioData.crypto)}
                data-realestate={JSON.stringify(portfolioData.realEstate)}
                data-summary={portfolioSummaryText}
                data-directive={chatbotDirective}
                data-initial-context={`User Portfolio Information:
${portfolioSummaryText}`}
                data-chatbot-directive={chatbotDirective}
              ></zapier-interfaces-chatbot-embed>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 