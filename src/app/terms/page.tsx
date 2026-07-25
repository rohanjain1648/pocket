import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#040814] text-slate-300 font-sans selection:bg-[#00ffff] selection:text-black py-16 px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-widest text-cyan-500 hover:text-cyan-400 mb-12 transition-colors">
          <ArrowLeft size={14} />
          BACK TO HOME
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-light tracking-wide text-slate-100 mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-slate-400">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Showrunner AI Content Intelligence Platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </p>

          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">2. AI-Generated Content</h2>
          <p>
            Our platform uses generative artificial intelligence, including our multi-agent orchestration workflow, to create personalized audio scripts and syntheses. While we strive for high quality (utilizing our Readability and Dialogue Intelligence agents), you acknowledge that AI-generated content may occasionally contain inaccuracies.
          </p>

          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">3. User Conduct</h2>
          <p>
            You agree not to use the platform to generate illegal, harmful, or abusive content. We reserve the right to terminate access to users who violate these guidelines or attempt to reverse-engineer our proprietary Story Analysis algorithms.
          </p>
          
          <h2 className="text-xl text-slate-200 font-medium mt-8 mb-4">4. Intellectual Property</h2>
          <p>
            The Live Content Engine retrieves summaries of public web articles. You remain responsible for ensuring you have the right to consume and utilize any synthesized audio derived from copyrighted external sources.
          </p>
        </div>
      </div>
    </main>
  );
}
