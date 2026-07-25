"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#040814] text-slate-300 font-sans selection:bg-[#00ffff] selection:text-black py-16 px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-widest text-cyan-500 hover:text-cyan-400 mb-12 transition-colors">
          <ArrowLeft size={14} />
          BACK TO HOME
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-light tracking-wide text-slate-100 mb-8">Contact Us</h1>
        
        <p className="mb-10 text-sm leading-relaxed text-slate-400">
          Interested in learning more about the Showrunner AI Content Intelligence Platform? 
          Reach out to us to discuss our multi-agent architecture or personalized audio solutions.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Contact Details */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail className="text-cyan-500 mt-1" size={20} />
              <div>
                <h3 className="text-sm font-medium text-slate-200 mb-1">Email</h3>
                <p className="text-sm text-slate-400 hover:text-cyan-400 cursor-pointer transition">
                  hello@showrunner.ai
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <MapPin className="text-cyan-500 mt-1" size={20} />
              <div>
                <h3 className="text-sm font-medium text-slate-200 mb-1">Office</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  PocketFM x Databricks Hackathon<br />
                  Virtual HQ
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="name" className="block text-xs uppercase tracking-widest text-slate-500 mb-2">Name</label>
              <input 
                type="text" 
                id="name" 
                className="w-full bg-[#0b1226] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-widest text-slate-500 mb-2">Email</label>
              <input 
                type="email" 
                id="email" 
                className="w-full bg-[#0b1226] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-xs uppercase tracking-widest text-slate-500 mb-2">Message</label>
              <textarea 
                id="message" 
                rows={4}
                className="w-full bg-[#0b1226] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                placeholder="How can we help?"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 rounded-lg px-6 py-3 text-xs tracking-widest hover:bg-cyan-800/50 transition-colors"
            >
              SEND MESSAGE
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
