/** Sandbox names, as the list and the workspace header show them. */
export const SANDBOX_NAME_MAX_LENGTH = 80;

/** How many sandboxes one person can keep; deleting one frees a slot. */
export const SANDBOX_MAX_PER_USER = 50;

/** Files in one project, counting package.json and the config files. */
export const SANDBOX_MAX_FILES = 100;

export const SANDBOX_PATH_MAX_LENGTH = 200;

/**
 * Absolute project paths made of plain segments: letters, digits, `.`, `_`
 * and `-`. Dotfiles are fine; `.` and `..` segments, empty segments and
 * anything a zip would read specially are not.
 */
export const SANDBOX_PATH_PATTERN = /^(\/(?!\.\.?(?:\/|$))[A-Za-z0-9._-]+)+$/;

/**
 * The whole project's source, in UTF-8 bytes. A save sends every file, and
 * the API's JSON body limit is 100 KB, so this leaves room for the escaping
 * and the rest of the body.
 */
export const SANDBOX_MAX_TOTAL_BYTES = 80_000;

export const SANDBOXES_PAGE_SIZE = 20;
