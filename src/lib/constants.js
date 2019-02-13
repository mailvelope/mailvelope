
/* constants */

// min height for large frame
export const LARGE_FRAME = 600;
// frame constants
export const FRAME_STATUS = 'stat';
// frame status
export const FRAME_ATTACHED = 'att';
export const FRAME_DETACHED = 'det';
// key for reference to frame object
export const FRAME_OBJ = 'fra';
// marker for dynamically created iframes
export const DYN_IFRAME = 'dyn';
export const IFRAME_OBJ = 'obj';
// armor header type
export const PGP_MESSAGE = 'msg';
export const PGP_SIGNATURE = 'sig';
export const PGP_PUBLIC_KEY = 'pub';
export const PGP_PRIVATE_KEY = 'priv';
// key status
export const PGP_KEYSTATUS_VALID = 3;
// display decrypted message
export const DISPLAY_INLINE = 'inline';
export const DISPLAY_POPUP = 'popup';
// editor type
export const PLAIN_TEXT = 'plain';
// keyring
export const KEYRING_DELIMITER = '|#|';
export const MAIN_KEYRING_ID = `localhost${KEYRING_DELIMITER}mailvelope`;
export const GNUPG_KEYRING_ID = `localhost${KEYRING_DELIMITER}gnupg`;
// colors for secure background
export const SECURE_COLORS = ['#e9e9e9', '#c0c0c0', '#808080', '#ffce1e', '#ff0000', '#85154a', '#6f2b8b', '#b3d1e3', '#315bab', '#1c449b', '#4c759c', '#1e8e9f', '#93b536'];
// 50 MB file size limit
export const MAX_FILE_UPLOAD_SIZE = 50 * 1024 * 1024;
// stable id if app runs in top frame
export const APP_TOP_FRAME_ID = 'apptopframeid';
