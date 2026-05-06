export interface FormValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[+]?[\d\s()-]{7,20}$/.test(phone);
}

export function validateForm(data: FormData): FormValidationErrors {
  const errors: FormValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = "Name is required";
  }

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!validateEmail(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!validatePhone(data.phone)) {
    errors.phone = "Please enter a valid phone number";
  }

  if (!data.message.trim()) {
    errors.message = "Message is required";
  } else if (data.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters";
  }

  return errors;
}

export function hasErrors(errors: FormValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function clearError(
  errors: FormValidationErrors,
  fieldName: keyof FormValidationErrors
): FormValidationErrors {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
}
