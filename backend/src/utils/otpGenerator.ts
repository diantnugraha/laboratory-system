/**
 * Generate random password
 * @param length - Length of password (default: 12)
 * @param options - Options for password generation
 * @returns Generated password
 */
interface PasswordOptions {
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

export const generatePassword = (length: number = 12, options: PasswordOptions = {}): string => {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true
  } = options;

  let charset = '';
  
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Ensure at least one character type is included
  if (!charset) {
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }

  let password = '';
  const charsetLength = charset.length;
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charsetLength));
  }
  
  return password;
};

/**
 * Generate secure random password (alias for generatePassword with secure defaults)
 * @param length - Length of password (default: 12)
 * @returns Generated password
 */
export const generateSecurePassword = (length: number = 12): string => {
  return generatePassword(length, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true
  });
};

// Backward compatibility - keep OTP functions but use password generator
export const generateOTP = (length: number = 6): string => {
  return generatePassword(length, {
    includeUppercase: false,
    includeLowercase: false,
    includeNumbers: true,
    includeSymbols: false
  });
};

/**
 * Generate random password 6 characters with letters only
 * @returns Generated password (6 characters, letters only)
 */
export const generatePassword6Letters = (): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let password = '';
  
  for (let i = 0; i < 6; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};













