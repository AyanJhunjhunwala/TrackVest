/**
 * Session manager to detect when the localhost server is shut down
 * Helps determine when to clear cached data
 */

const SESSION_ID_KEY = 'tv_session_id';
const SESSION_TIMESTAMP_KEY = 'tv_session_timestamp';
const MAX_SESSION_IDLE_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Initialize a new session when the app starts
 */
export const initializeSession = () => {
  try {
    // Generate a new session ID
    const sessionId = generateSessionId();
    const timestamp = new Date().toISOString();
    
    // Store in localStorage
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, timestamp);
    
    console.log(`New session initialized: ${sessionId}`);
    
    // Set up a heartbeat to update the timestamp periodically
    startSessionHeartbeat();
    
    return sessionId;
  } catch (error) {
    console.error('Failed to initialize session:', error);
    return null;
  }
};

/**
 * Check if the current session is the same as the stored one
 * If not, this means the app was likely relaunched after the server was shut down
 * @return {boolean} - true if the current session is new
 */
export const isNewSession = () => {
  try {
    // Get the stored session ID
    const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
    
    // If no session ID stored, this is definitely a new session
    if (!storedSessionId) {
      return true;
    }
    
    // Check if the session has expired
    const storedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (storedTimestamp) {
      const lastActivity = new Date(storedTimestamp).getTime();
      const now = new Date().getTime();
      
      // If the last activity was more than MAX_SESSION_IDLE_TIME ago, it's a new session
      if (now - lastActivity > MAX_SESSION_IDLE_TIME) {
        console.log('Session expired due to inactivity');
        return true;
      }
    }
    
    // This is not a new session
    return false;
  } catch (error) {
    console.error('Error checking session:', error);
    return true; // Assume new session in case of error
  }
};

/**
 * Update the session timestamp to keep the session alive
 */
export const updateSessionTimestamp = () => {
  try {
    localStorage.setItem(SESSION_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Failed to update session timestamp:', error);
  }
};

/**
 * Generate a unique session ID
 * @return {string} - unique session ID
 */
const generateSessionId = () => {
  return 'tv_' + 
    Math.random().toString(36).substring(2, 10) + 
    '_' + 
    Date.now().toString(36);
};

/**
 * Start a heartbeat to keep the session alive while the app is running
 */
const startSessionHeartbeat = () => {
  // Update timestamp every 5 minutes
  const heartbeatInterval = 5 * 60 * 1000; // 5 minutes
  
  // Do an immediate update
  updateSessionTimestamp();
  
  // Set up interval for future updates
  const intervalId = setInterval(() => {
    updateSessionTimestamp();
  }, heartbeatInterval);
  
  // Clean up interval on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId);
    });
  }
  
  return intervalId;
};

/**
 * Clear all session data
 */
export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}; 