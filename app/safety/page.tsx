'use client';

import Link from 'next/link';
import { Shield, AlertTriangle, Ban, Flag, MessageSquare, CheckCircle2, Lock, Eye, UserX, Bell } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Editable } from '@/components/site-content/editable';

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl gradient-bg text-white mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <Editable as="h1" id="safety.title" className="block text-3xl font-bold mb-3">Safety Center</Editable>
          <Editable as="p" multiline id="safety.sub" className="block text-muted-foreground max-w-2xl mx-auto">Your safety is our priority. Learn how to protect yourself and others on Workivo.</Editable>
        </div>

        {/* Safety Tips */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {[
            { icon: AlertTriangle, title: 'Never pay for a job', desc: 'Legitimate employers don\'t ask for payment to hire you. If someone asks for money, report them immediately.' },
            { icon: Lock, title: 'Protect personal information', desc: 'Don\'t share sensitive data like your social security number, bank details, or home address with strangers.' },
            { icon: MessageSquare, title: 'Stay on the platform', desc: 'Keep communications on Workivo. Our messaging system is monitored for safety.' },
            { icon: Eye, title: 'Meet safely', desc: 'When meeting in person, choose public places and let someone know where you\'re going.' },
            { icon: Flag, title: 'Report suspicious behavior', desc: 'Use the report button on any post or profile to flag inappropriate content to our team.' },
            { icon: UserX, title: 'Block users', desc: 'Block anyone who makes you uncomfortable. They won\'t be able to contact you again.' },
          ].map((tip, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg-soft text-primary shrink-0">
                    <tip.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Editable as="h3" id={`safety.tip${i + 1}.title`} className="block font-semibold text-sm">{tip.title}</Editable>
                    <Editable as="p" multiline id={`safety.tip${i + 1}.desc`} className="block text-sm text-muted-foreground mt-1">{tip.desc}</Editable>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Age-aware protections */}
        <Card className="glass-card mb-8">
          <CardHeader><h3 className="font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> <Editable id="safety.protect.title">Protections for Younger Users</Editable></h3></CardHeader>
          <CardContent className="space-y-3">
            {[
              'Users under 18 are marked with a minor badge and have restricted messaging capabilities',
              'Age-appropriate job restrictions are enforced — no adult-oriented or hazardous work',
              'Employers are responsible for complying with local labor laws regarding minors',
              'Special moderation applies to interactions involving underage users',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <Editable as="p" multiline id={`safety.protect.item${i + 1}`} className="text-sm">{item}</Editable>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reporting */}
        <Card className="glass-card mb-8">
          <CardHeader><Editable as="h3" id="safety.report.title" className="block font-semibold">How to Report</Editable></CardHeader>
          <CardContent>
            <Editable as="p" multiline id="safety.report.intro" className="block text-sm text-muted-foreground mb-4">If you encounter suspicious, inappropriate, or fraudulent content, you can report it directly from:</Editable>
            <div className="space-y-2">
              {['Any post — click the Report button', 'Any profile — click the Flag icon', 'Any conversation — click the Report option in the chat menu'].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  <Editable id={`safety.report.item${i + 1}`} className="text-sm">{item}</Editable>
                </div>
              ))}
            </div>
            <Editable as="p" multiline id="safety.report.outro" className="block text-sm text-muted-foreground mt-4">Our moderation team reviews all reports and takes appropriate action, including removing content and suspending accounts.</Editable>
          </CardContent>
        </Card>

        {/* Report Categories */}
        <Card className="glass-card mb-8">
          <CardHeader><Editable as="h3" id="safety.cats.title" className="block font-semibold">Report Categories</Editable></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {['Scam', 'Fake Job', 'Harassment', 'Incorrect Information', 'Unsafe Request', 'Fraud / Payment Issue', 'Other'].map((cat, ci) => (
                <div key={cat} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <Ban className="h-4 w-4 text-destructive" /> <Editable id={`safety.cat${ci + 1}`}>{cat}</Editable>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legal reminder */}
        <Card className="glass-card bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <Editable as="p" id="safety.compliance.title" className="block text-sm font-medium">Compliance Reminder</Editable>
                <Editable as="p" multiline id="safety.compliance.text" className="block text-sm text-muted-foreground mt-1">Users and employers are responsible for complying with applicable employment laws in their jurisdiction. Workivo does not guarantee the legality of any work arrangement.</Editable>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button asChild><Link href="/signup"><Editable id="safety.cta">Get Started Safely</Editable></Link></Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}