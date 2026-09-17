// Razorpay Standard Checkout — client-side only, test mode. No backend
// order creation or signature verification, on purpose: this is a fast
// path to a real payment gateway popup ahead of a deadline, not a
// production-grade integration. A real deployment would create the
// order server-side (Edge Function) and verify the payment signature
// before trusting it, so the amount can't be tampered with client-side.
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TcyS5pica6pQaA'
const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

let scriptLoadPromise = null

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'))
    document.body.appendChild(script)
  })
  return scriptLoadPromise
}

export async function openRazorpayCheckout({ amount, description, onSuccess, onDismiss }) {
  await loadRazorpayScript()

  const razorpay = new window.Razorpay({
    key: RAZORPAY_KEY_ID,
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    name: 'AgriSphere',
    description,
    theme: { color: '#2f6f3e' },
    handler: () => onSuccess(),
    modal: { ondismiss: () => onDismiss?.() },
  })
  razorpay.open()
}
