import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { Editable } from '@/components/site-content/editable';
import { Shield, FileText, Info, Mail, HelpCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <Editable as="p" id="footer.tagline" className="mt-3 block text-sm text-muted-foreground max-w-xs">Find Work. Find People. Build Opportunities.</Editable>
          </div>
          <div>
            <Editable as="h3" id="footer.company" className="text-sm font-semibold mb-3 block">Company</Editable>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#about" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> <Editable id="footer.link.about">About</Editable></Link></li>
              <li><Link href="/safety" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> <Editable id="footer.link.safety">Safety</Editable></Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> <Editable id="footer.link.contact">Contact</Editable></Link></li>
              <li><Link href="/help" className="hover:text-foreground transition-colors flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> <Editable id="footer.link.help">Help Center</Editable></Link></li>
            </ul>
          </div>
          <div>
            <Editable as="h3" id="footer.legal" className="text-sm font-semibold mb-3 block">Legal</Editable>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> <Editable id="footer.link.terms">Terms</Editable></Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> <Editable id="footer.link.privacy">Privacy</Editable></Link></li>
            </ul>
          </div>
          <div>
            <Editable as="h3" id="footer.explore" className="text-sm font-semibold mb-3 block">Explore</Editable>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/find-work" className="hover:text-foreground transition-colors"><Editable id="footer.link.findwork">Find Work</Editable></Link></li>
              <li><Link href="/find-people" className="hover:text-foreground transition-colors"><Editable id="footer.link.findpeople">Find People</Editable></Link></li>
              <li><Link href="/post/create" className="hover:text-foreground transition-colors"><Editable id="footer.link.post">Post an Opportunity</Editable></Link></li>
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors"><Editable id="footer.link.how">How It Works</Editable></Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} <Editable id="footer.copyright">Workivo. All rights reserved.</Editable></p>
        </div>
      </div>
    </footer>
  );
}