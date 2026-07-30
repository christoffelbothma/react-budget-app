function isOffline() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine;
}

export function getLoginErrorMessage(error) {
  const details = String(error?.message || error || '').toLowerCase();

  if (details.includes('toomanyfailedattempts') || details.includes('rate limit')) {
    return 'Too many unsuccessful attempts. Please wait a little while and try again.';
  }

  if (
    details.includes('invalidaccountid')
    || details.includes('invalidsecret')
    || details.includes('invalid credentials')
  ) {
    return 'Incorrect email or password. Please check your details and try again.';
  }

  if (details.includes('network') || details.includes('fetch') || isOffline()) {
    return 'We could not connect to BudgetR. Check your internet connection and try again.';
  }

  return 'Incorrect email or password. Please check your details and try again.';
}

export function getRegistrationErrorMessage(error) {
  const details = String(error?.message || error || '').toLowerCase();

  if (details.includes('account') && (details.includes('exist') || details.includes('already'))) {
    return 'An account already exists for this email. Try logging in instead.';
  }

  if (details.includes('password')) {
    return 'Choose a password with at least 8 characters.';
  }

  if (details.includes('network') || details.includes('fetch') || isOffline()) {
    return 'We could not connect to BudgetR. Check your internet connection and try again.';
  }

  return 'We could not create your account right now. Please try again.';
}
