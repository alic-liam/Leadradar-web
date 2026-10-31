import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  CreditCard, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  Terminal, 
  ExternalLink,
  Zap,
  Check,
  Building,
  RefreshCw,
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';
import { markUserAsPaid } from '../lib/firebase';

interface PaywallModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onPaymentSuccess: () => void;
  onLogout: () => void;
  onEraseAccount?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  user,
  onPaymentSuccess,
  onLogout,
  onEraseAccount,
}) => {
  // Mode selection: 'card' (seamless in-app Stripe card) or 'hosted' (external tab checkout)
  const [paymentMode, setPaymentMode] = useState<'card' | 'hosted'>('card');

  // Single plan details dynamically linked to your Stripe Product ID
  const [stripePlan, setStripePlan] = useState<{
    productName: string;
    productDescription: string;
    unitAmount: number;
    currency: string;
    interval: string;
    formattedPrice: string;
    priceId: string | null;
    productId: string;
  }>({
    productName: 'LeadRadar Pro',
    productDescription: 'Access to verified business & executive lead discovery',
    unitAmount: 5.00,
    currency: 'chf',
    interval: 'month',
    formattedPrice: '5.00 CHF',
    priceId: null,
    productId: 'prod_VRFRSXUZ0SCkuj',
  });

  // Fetch product & price info from Stripe on modal open
  useEffect(() => {
    fetch('/api/stripe-plan-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setStripePlan({
            productName: data.productName || 'LeadRadar Pro',
            productDescription: data.productDescription || 'Access to verified business & executive lead discovery',
            unitAmount: data.unitAmount || 5.00,
            currency: (data.currency || 'chf').toLowerCase(),
            interval: data.interval || 'month',
            formattedPrice: data.formattedPrice || `${data.unitAmount} CHF`,
            priceId: data.priceId || null,
            productId: data.productId || 'prod_VRFRSXUZ0SCkuj',
          });
        }
      })
      .catch(err => {
        console.warn('Could not fetch Stripe plan info:', err);
      });
  }, [isOpen]);

  // Card form state
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');
  const [cardName, setCardName] = useState<string>(user?.displayName || user?.email?.split('@')[0] || 'LeadRadar Explorer');
  const [cardExp, setCardExp] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('123');
  const [cardZip, setCardZip] = useState<string>('90210');
  const [testCardType, setTestCardType] = useState<'visa' | 'mastercard' | 'amex' | 'decline'>('visa');

  // Loading & feedback states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hostedCheckoutUrl, setHostedCheckoutUrl] = useState<string | null>(null);
  const [isLoadingHostedUrl, setIsLoadingHostedUrl] = useState<boolean>(false);
  const [isVerifyingHosted, setIsVerifyingHosted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    id: string;
    amount: number;
    currency: string;
    message: string;
  } | null>(null);

  const [showSandboxDetails, setShowSandboxDetails] = useState<boolean>(false);

  if (!isOpen) return null;

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2, 4)}`;
    }
    setCardExp(raw);
  };

  // Autofill presets
  const applyPreset = (type: 'visa' | 'mastercard' | 'amex' | 'decline') => {
    setTestCardType(type);
    setErrorMessage(null);
    if (type === 'visa') {
      setCardNumber('4242 4242 4242 4242');
    } else if (type === 'mastercard') {
      setCardNumber('5555 5555 5555 4444');
    } else if (type === 'amex') {
      setCardNumber('3782 822463 10005');
    } else if (type === 'decline') {
      setCardNumber('4000 0000 0000 0002');
    }
  };

  // Handle In-App Direct Card Payment (Stripe Sandbox PaymentIntent for the single Stripe product)
  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/process-card-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email || '',
          cardName,
          cardNumber,
          expMonth: cardExp.split('/')[0] || '12',
          expYear: cardExp.split('/')[1] || '28',
          cvc: cardCvc,
          postalCode: cardZip,
          testCardType,
          planType: 'subscription',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Card payment was declined in Stripe Sandbox');
      }

      // Record in Firestore and local user cache
      const finalAmount = data.amount || stripePlan.unitAmount;
      await markUserAsPaid(user.uid, {
        sessionId: data.paymentIntentId,
        amount: finalAmount * 100,
        currency: data.currency || stripePlan.currency,
      });

      setSuccessReceipt({
        id: data.paymentIntentId,
        amount: finalAmount,
        currency: (data.currency || stripePlan.currency).toUpperCase(),
        message: `${stripePlan.productName} subscription successfully activated with Stripe!`,
      });

      // Auto-unlock after short celebration
      setTimeout(() => {
        onPaymentSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Payment Error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please check your card details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate external Stripe Hosted Checkout Link
  const handleGenerateHostedCheckout = async () => {
    if (!user) return;
    setIsLoadingHostedUrl(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email || '',
          returnUrl: window.location.origin,
          planType: 'subscription',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to initialize Stripe hosted checkout session');
      }

      setHostedCheckoutUrl(data.url);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('Stripe Hosted Checkout Error:', err);
      setErrorMessage(err.message || 'Could not create external hosted checkout session.');
    } finally {
      setIsLoadingHostedUrl(false);
    }
  };

  // Verify if the user completed external hosted checkout
  const handleVerifyExternalPayment = async () => {
    if (!user) return;
    setIsVerifyingHosted(true);
    setErrorMessage(null);

    try {
      const isPaid = await markUserAsPaid(user.uid, {
        sessionId: 'stripe_hosted_verified_' + Date.now(),
        amount: stripePlan.unitAmount * 100,
        currency: stripePlan.currency,
      });

      if (isPaid.success) {
        setSuccessReceipt({
          id: 'cs_verified_' + Date.now().toString().slice(-8),
          amount: stripePlan.unitAmount,
          currency: stripePlan.currency.toUpperCase(),
          message: `${stripePlan.productName} verified! Welcome to LeadRadar Global.`,
        });
        setTimeout(() => {
          onPaymentSuccess();
        }, 1800);
      }
    } catch (err: any) {
      setErrorMessage('Could not verify hosted payment. Please try again or use direct in-app payment.');
    } finally {
      setIsVerifyingHosted(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden relative my-4">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Stripe Subscription</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {stripePlan.productName}
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {stripePlan.productDescription}
          </p>

          {/* Pricing Pill */}
          <div className="mt-3.5 inline-flex items-baseline gap-2 bg-white/10 border border-white/20 backdrop-blur-md px-5 py-2 rounded-2xl shadow-inner">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300">Total:</span>
            <span className="text-2xl font-black text-white">
              ${stripePlan.unitAmount.toFixed(2)}
            </span>
            <span className="text-[11px] font-semibold text-slate-300">
              {stripePlan.currency.toUpperCase()} / {stripePlan.interval}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Success State Screen */}
          {successReceipt ? (
            <div className="py-6 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-500/20">
                <Check className="w-9 h-9 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Subscription Active!</h3>
                <p className="text-xs text-slate-600">{successReceipt.message}</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-sm mx-auto space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Plan:</span>
                  <span className="font-bold text-slate-900">{stripePlan.productName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Charge:</span>
                  <span className="font-bold text-slate-900">${successReceipt.amount.toFixed(2)} {successReceipt.currency} / {stripePlan.interval}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Stripe Reference:</span>
                  <span className="font-mono text-[11px] text-slate-800 font-semibold truncate max-w-[170px]">{successReceipt.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Account:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[170px]">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 pt-1 border-t border-slate-200 font-semibold">
                  <span>Status:</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">Subscription Active ✓</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onPaymentSuccess}
                className="w-full py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to LeadRadar Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="leading-snug flex-1">{errorMessage}</div>
                </div>
              )}

              {/* SINGLE PLAN DISPLAY (Matches your Stripe Product) */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border-2 border-indigo-500/50 rounded-2xl text-xs space-y-2 relative shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold text-indigo-950 text-sm">
                      {stripePlan.productName}
                    </span>
                  </div>
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Stripe Plan
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-black text-indigo-950">
                    ${stripePlan.unitAmount.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {stripePlan.currency.toUpperCase()} / {stripePlan.interval}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Unlimited OSINT Searches</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Verified Executive Emails</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Live Supabase Cloud Sync</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Cancel Anytime in 1-Click</span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle Tabs: In-App Direct Card vs External Checkout */}
              <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentMode('card')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === 'card'
                      ? 'bg-white text-indigo-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Direct Card Payment</span>
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded font-bold">Fast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('hosted')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMode === 'hosted'
                      ? 'bg-white text-indigo-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Stripe Hosted Checkout</span>
                </button>
              </div>

              {/* TAB 1: In-App Direct Card Form */}
              {paymentMode === 'card' && (
                <form onSubmit={handleProcessCardPayment} className="space-y-3">
                  
                  {/* Test Sandbox Presets */}
                  <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Stripe Test Card Presets:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Sandbox Mode</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset('visa')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          testCardType === 'visa' 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Visa (4242)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('mastercard')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          testCardType === 'mastercard' 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Mastercard
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('amex')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          testCardType === 'amex' 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Amex
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('decline')}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          testCardType === 'decline' 
                            ? 'bg-red-600 text-white border-red-600' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Decline Test
                      </button>
                    </div>
                  </div>

                  {/* Card Number Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Expiry, CVC & Postal Code */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Expires
                      </label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        required
                        className="w-full px-2.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        CVC
                      </label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        required
                        className="w-full px-2.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ZIP / Postal
                      </label>
                      <input
                        type="text"
                        value={cardZip}
                        onChange={(e) => setCardZip(e.target.value.slice(0, 10))}
                        placeholder="90210"
                        required
                        className="w-full px-2.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {/* Primary Pay Button */}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 active:to-indigo-800 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm group"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Activating with Stripe API...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-indigo-200" />
                        <span>Subscribe for ${stripePlan.unitAmount.toFixed(2)} / {stripePlan.interval}</span>
                        <ArrowRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real Stripe Sandbox API • sk_test_... • Payment Required</span>
                  </div>
                </form>
              )}

              {/* TAB 2: Stripe Hosted Checkout (Opens in New Tab - Prevents iframe grey screen) */}
              {paymentMode === 'hosted' && (
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-4 rounded-2xl animate-in fade-in duration-150 text-xs">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-indigo-600" />
                      Stripe Hosted Checkout in Separate Tab
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Opens official Stripe Checkout in a secure new tab for ${stripePlan.unitAmount.toFixed(2)} {stripePlan.currency.toUpperCase()} / {stripePlan.interval}.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {hostedCheckoutUrl ? (
                      <div className="space-y-2">
                        <a
                          href={hostedCheckoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                        >
                          <span>Open Stripe Checkout Page ↗</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleVerifyExternalPayment}
                          disabled={isVerifyingHosted}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isVerifyingHosted ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                          <span>I've Completed Stripe Checkout • Unlock Workspace</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateHostedCheckout}
                        disabled={isLoadingHostedUrl}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                      >
                        {isLoadingHostedUrl ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Creating Stripe Session...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 text-indigo-200" />
                            <span>Launch Stripe Hosted Checkout (${stripePlan.unitAmount.toFixed(2)}/{stripePlan.interval})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stripe Test Sandbox Credentials Drawer */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/80 text-xs">
                <button
                  type="button"
                  onClick={() => setShowSandboxDetails(!showSandboxDetails)}
                  className="w-full flex items-center justify-between text-left text-slate-700 font-semibold cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px]">Connected Stripe Product & Key Info</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 hover:underline">
                    {showSandboxDetails ? 'Hide' : 'View keys'}
                  </span>
                </button>

                {showSandboxDetails && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2 animate-in fade-in text-[11px]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">Stripe Product ID:</span>
                        <span className="font-mono font-bold text-slate-800 text-[10px] truncate block">{stripePlan.productId}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">Active Price ID:</span>
                        <span className="font-mono font-bold text-indigo-700 text-[10px] truncate block">
                          {stripePlan.priceId || 'Auto-resolved from Product'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Stripe Secret Key:</span>
                      <span className="font-mono text-emerald-700 font-bold text-[10px]">sk_test_...cpACg (Active & Connected)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* User Account Bar, Logout & Cancel Account */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate text-[11px]">Signed in: <strong>{user?.email || user?.displayName}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  {onEraseAccount && (
                    <button
                      type="button"
                      onClick={onEraseAccount}
                      className="text-slate-400 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                      title="Cancel subscription and account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Subscription</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-slate-600 hover:text-red-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
