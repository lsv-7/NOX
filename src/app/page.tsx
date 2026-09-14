import React from "react";
import ProductView from "@/components/ProductView";
import { ShieldCheck, Truck, Clock, Mail, Phone } from "lucide-react";

export default async function Page() {
  // Load configuration securely on the server-side
  const productPriceInr = parseInt(process.env.NOX_PRODUCT_PRICE_INR || "999", 10);
  const shippingChargeInr = parseInt(process.env.NOX_SHIPPING_CHARGE_INR || "0", 10);
  const isMockMode = process.env.NOX_MOCK_MODE === "true";

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0E11] text-[#F5F0E6]">
      
      {/* Premium Minimal Navbar (DARK) */}
      <header className="border-b border-[rgba(212,167,44,0.22)] bg-[#0D0E11] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="font-serif text-3xl tracking-[0.2em] font-light text-[#D4A72C] hover:text-[#F5F0E6] transition-colors">
            NOX
          </a>
          
          <nav className="hidden md:flex items-center space-x-10 text-[10px] uppercase tracking-[0.25em] text-[#CFC5B4] font-medium">
            <a href="#" className="hover:text-[#D4A72C] transition-all duration-300">Home</a>
            <a href="#product" className="hover:text-[#D4A72C] transition-all duration-300">Shop</a>
            <a href="#about" className="hover:text-[#D4A72C] transition-all duration-300">About</a>
            <a href="#tracking" className="hover:text-[#D4A72C] transition-all duration-300">My Orders</a>
            <a href="#contact" className="hover:text-[#D4A72C] transition-all duration-300">Support</a>
          </nav>
          
          <a
            href="#product"
            className="bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] transition-all duration-300 text-[9px] uppercase tracking-[0.2em] font-bold px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Buy Now
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full">
        
        {/* Banner Alert for Mock Mode (Premium Gold/Charcoal Style - DARK) */}
        {isMockMode && (
          <div className="max-w-6xl mx-auto px-6 mt-6">
            <div className="bg-[#08090B] border border-[#D4A72C] text-[#F5F0E6] rounded-2xl p-5 flex items-start gap-4 shadow-sm">
              <Clock className="w-5 h-5 text-[#D4A72C] shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-sm tracking-wide text-[#D4A72C] font-semibold">Running in Demo / Mock Mode</p>
                <p className="text-[11px] text-[#CFC5B4] font-light mt-1.5 leading-relaxed">
                  Database operations simulate persistence in a local file (`nox_mock_database.json`). 
                  Checkout payments execute using simulated browser actions, and external messaging remains inactive.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product Focus Section (DARK) */}
        <div id="product" className="scroll-mt-20">
          <ProductView
            productPriceInr={productPriceInr}
            shippingChargeInr={shippingChargeInr}
            isMockMode={isMockMode}
          />
        </div>

        {/* Brand Philosophy (DARK) */}
        <section id="about" className="py-24 bg-[#08090B] text-[#F5F0E6] scroll-mt-20 border-t border-b border-[rgba(212,167,44,0.22)]">
          <div className="max-w-3xl mx-auto text-center px-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4A72C] font-semibold">Our Philosophy</span>
            <h2 className="font-serif text-3xl md:text-5xl font-light text-[#F5F0E6] mt-3 mb-8 tracking-wide leading-tight">
              Timeless Care. Refined Skin.
            </h2>
            <div className="w-12 h-[1px] bg-[#D4A72C] mx-auto mb-8"></div>
            <p className="text-[#CFC5B4] font-light leading-relaxed text-sm md:text-base max-w-2xl mx-auto">
              At NOX, we formulate for overnight restoration, crafting premium, targeted treatments 
              designed to align with your skin&apos;s natural repair cycles. We bypass complex routines 
              and synthetic fillers in favor of botanical precision, delivering essential hydration 
              and visible radiance. Pure, minimal ingredients crafted for your daily ritual.
            </p>
          </div>
        </section>

        {/* Trust & Guarantee Section (DARK - Deep Black & Gold Border Card) */}
        <section className="bg-[#0D0E11] text-[#F5F0E6] py-20 border-b border-[rgba(212,167,44,0.22)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-3xl p-10 md:p-12 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                
                {/* Secure Payments */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[rgba(212,167,44,0.22)] shadow-sm mb-5">
                    <ShieldCheck className="w-6 h-6 text-[#D4A72C]" />
                  </div>
                  <h3 className="font-serif text-lg font-light text-[#F5F0E6] mb-2.5 tracking-wide">Secure Checkout</h3>
                  <p className="text-xs text-[#CFC5B4] font-light leading-relaxed max-w-xs">
                    All orders are encrypted and securely verified via Razorpay, India&apos;s leading secure checkout gateway.
                  </p>
                </div>

                {/* Direct Delivery */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[rgba(212,167,44,0.22)] shadow-sm mb-5">
                    <Truck className="w-6 h-6 text-[#D4A72C]" />
                  </div>
                  <h3 className="font-serif text-lg font-light text-[#F5F0E6] mb-2.5 tracking-wide">Premium Shipping</h3>
                  <p className="text-xs text-[#CFC5B4] font-light leading-relaxed max-w-xs">
                    Each package is prepared directly at our source and shipped via trusted courier networks with real-time tracking.
                  </p>
                </div>

                {/* Dedicated Support */}
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-14 h-14 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[rgba(212,167,44,0.22)] shadow-sm mb-5">
                    <Clock className="w-6 h-6 text-[#D4A72C]" />
                  </div>
                  <h3 className="font-serif text-lg font-light text-[#F5F0E6] mb-2.5 tracking-wide">Customer Assistance</h3>
                  <p className="text-xs text-[#CFC5B4] font-light leading-relaxed max-w-xs">
                    Have questions about order progress or skin match? Get in touch with our team for dedicated assistance.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Contact/Support Section (DARK - Charcoal Background) */}
        <section id="contact" className="py-24 bg-[#0D0E11] text-[#F5F0E6] scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center px-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4A72C] font-semibold">Get in Touch</span>
            <h2 className="font-serif text-3xl font-light text-[#F5F0E6] mt-3 mb-10 tracking-wide">Customer Relations</h2>
            
            <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-8 md:p-10 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-xs font-light">
              <div className="flex flex-col items-center">
                <Mail className="w-5 h-5 text-[#D4A72C] mb-2.5" />
                <span className="uppercase tracking-[0.2em] text-[#D4A72C] font-semibold mb-1 text-[9px]">Email</span>
                <a href="mailto:noxelitecosmetics@gmail.com" className="text-[#F5F0E6] font-semibold hover:text-[#D4A72C] transition-colors font-mono">
                  noxelitecosmetics@gmail.com
                </a>
              </div>
              
              <div className="flex flex-col items-center border-t sm:border-t-0 sm:border-x border-[rgba(212,167,44,0.22)] pt-5 sm:pt-0">
                <Phone className="w-5 h-5 text-[#D4A72C] mb-2.5" />
                <span className="uppercase tracking-[0.2em] text-[#D4A72C] font-semibold mb-1 text-[9px]">WhatsApp / Phone</span>
                <a href="https://wa.me/918309053090" target="_blank" rel="noopener noreferrer" className="text-[#F5F0E6] font-semibold hover:text-[#D4A72C] transition-colors font-mono">
                  +91 8309053090
                </a>
              </div>

              <div className="flex flex-col items-center border-t sm:border-t-0 pt-5 sm:pt-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#D4A72C] mb-2.5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <span className="uppercase tracking-[0.2em] text-[#D4A72C] font-semibold mb-1 text-[9px]">Instagram</span>
                <a href="https://instagram.com/noxbeauty.in" target="_blank" rel="noopener noreferrer" className="text-[#F5F0E6] font-semibold hover:text-[#D4A72C] transition-colors">
                  @noxbeauty.in
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Luxury Footer (DARK - Deep Black) */}
      <footer className="bg-[#08090B] border-t border-[rgba(212,167,44,0.22)] py-16 text-[11px] text-[#CFC5B4] font-light">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <span className="font-serif text-2xl tracking-[0.25em] font-light text-[#D4A72C]">NOX</span>
            <p className="leading-relaxed text-[#CFC5B4]">Skincare refined. Targeted overnight formulations supporting your natural cellular recovery cycles.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-[#F5F0E6] uppercase tracking-[0.2em] text-[9px] mb-4">Shop</h4>
            <ul className="space-y-2.5">
              <li><a href="#product" className="hover:text-[#D4A72C] hover:underline transition-all">NOX Night Cream</a></li>
              <li><a href="#checkout" className="hover:text-[#D4A72C] hover:underline transition-all">Checkout Details</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#F5F0E6] uppercase tracking-[0.2em] text-[9px] mb-4">Client Care</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="hover:text-[#D4A72C] hover:underline transition-all">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#D4A72C] hover:underline transition-all">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-[#D4A72C] hover:underline transition-all">Shipping & Delivery</a></li>
              <li><a href="#" className="hover:text-[#D4A72C] hover:underline transition-all">Cancellation & Refunds</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-[#F5F0E6] uppercase tracking-[0.2em] text-[9px] mb-4">Headquarters</h4>
            <p className="leading-relaxed text-[#CFC5B4]">
              NOX Skincare Private Limited<br />
              DSIDC Bawana Industrial Area,<br />
              SEC-2, New Delhi - 110039<br />
              India
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-neutral-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} NOX. All rights reserved.</p>
          <p className="tracking-widest uppercase text-[9px] text-[#D4A72C]">Handcrafted in India</p>
        </div>
      </footer>

    </div>
  );
}
