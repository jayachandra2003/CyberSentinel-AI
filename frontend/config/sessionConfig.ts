export const SESSION_CONFIG = {
  /** Idle timeout duration in minutes when "Remember Device" is OFF (5 minutes) */
  IDLE_TIMEOUT_MINUTES: 5,
  /** Idle timeout duration in minutes when "Remember Device" is ON (15 minutes) */
  REMEMBER_IDLE_TIMEOUT_MINUTES: 15,
  /** Warning threshold duration in seconds before automatic logout occurs (60 seconds) */
  WARNING_BEFORE_LOGOUT_SECONDS: 60,
  /** Event throttle interval in milliseconds to prevent excessive event listener updates */
  ACTIVITY_THROTTLE_MS: 1000,
};
