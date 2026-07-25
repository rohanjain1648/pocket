import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#040814] text-slate-300 font-sans selection:bg-[#00ffff] selection:text-black py-16 px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-widest text-cyan-500 hover:text-cyan-400 mb-12 transition-colors">
          <ArrowLeft size={14} />
          BACK TO HOME
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-light tracking-wide text-slate-100 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-slate-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">1. Information We Collect</h2>
          <p>
            The AI Content Intelligence Platform ("Showrunner") collects information that you provide directly to us, including your audio preferences, listening history, and interaction data with our conversational agents. This enables our Dynamic User Profile module to function effectively.
          </p>

          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect primarily to personalize your audio experiences. Our 14 Intelligence Modules analyze your preferences to generate highly contextual and engaging serialized audio content. We do not sell your personal data to third parties.
          </p>

          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">3. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information. Your dynamic user profile is stored securely and accessed only by our internal multi-agent orchestration system to improve your recommendations.
          </p>
          
          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">4. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us via our Contact page.
          </p>
        </div>
      </div>
    </main>
  );
}
