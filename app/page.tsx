'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Briefcase, MessageSquare, ShieldCheck, Zap, ArrowRight, ArrowUpRight, CheckCircle2,
  MapPin, Clock, TrendingUp, BadgeCheck, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { Reveal, WordReveal } from '@/components/motion/reveal';
import { TiltCard } from '@/components/motion/tilt-card';
import { Magnetic } from '@/components/motion/magnetic';
import { Marquee } from '@/components/motion/marquee';
import { Editable } from '@/components/site-content/editable';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { supabase } from '@/lib/supabase/client';
import type { WorkPost, Category } from '@/lib/types';
import { WORK_TYPES, formatTimeAgo, formatPay, getWorkTypeLabel } from '@/lib/constants';

const MARQUEE_ITEMS = [...WORK_TYPES.map(t => t.label), 'Remote', 'Hybrid', 'On-site'];

function SectionHeading({ id, eyebrow, title, accent, sub, action }: { id: string; eyebrow: string; title: string; accent: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        <Reveal><Editable as="p" id={`${id}.eyebrow`} className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</Editable></Reveal>
        <WordReveal lines={[{ text: title, id: `${id}.title` }, { text: accent, className: 'gradient-text', id: `${id}.accent` }]} className="text-4xl font-bold tracking-tight sm:text-5xl" />
        {sub && <Reveal delay={0.15}><Editable as="p" id={`${id}.sub`} className="mt-3 max-w-xl text-muted-foreground">{sub}</Editable></Reveal>}
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [posts, setPosts] = useState<WorkPost[]>([]);
  const [seekers, setSeekers] = useState<WorkPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: postData }, { data: peopleData }, { data: catData }] = await Promise.all([
        supabase
          .from('work_posts')
          .select('*, category:categories(*), profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location), skills:work_post_skills(skill)')
          .eq('type', 'looking_for_people')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6),
        // Only people who have posted that they're looking for work are listed.
        supabase
          .from('work_posts')
          .select('*, profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location), skills:work_post_skills(skill)')
          .eq('type', 'looking_for_work')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4),
        supabase.from('categories').select('*').order('name'),
      ]);

      const withSkills = (rows: typeof postData) =>
        (rows || []).map(p => ({
          ...p,
          skills: (p.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
        })) as WorkPost[];

      setPosts(withSkills(postData));
      setSeekers(withSkills(peopleData));
      setCategories(catData as Category[] || []);
      setLoading(false);
    })();
  }, []);

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-background">
        <Navbar />

        <Hero />

        {/* Marquee */}
        <section className="border-y bg-card/50 py-8">
          <Marquee items={MARQUEE_ITEMS} className="text-outline text-5xl font-black uppercase tracking-tight sm:text-7xl" />
          <div className="mt-4">
            <Marquee items={[...MARQUEE_ITEMS].reverse()} reverse className="text-3xl font-bold uppercase tracking-tight text-muted-foreground/60 sm:text-4xl" />
          </div>
        </section>

        <HowItWorks />

        {/* Featured Opportunities */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="home.featured"
              eyebrow="Featured"
              title="Real jobs"
              accent="posted by real people."
              action={
                <Link href="/find-work" className="hidden items-center text-sm font-medium text-primary hover:underline sm:flex">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              }
            />
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : posts.length === 0 ? (
              <Reveal>
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                    <Briefcase className="mb-3 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No opportunities posted yet. Be the first!</p>
                    <Button className="mt-4" onClick={() => router.push('/signup')}>Get Started</Button>
                  </CardContent>
                </Card>
              </Reveal>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post, i) => (
                  <Reveal key={post.id} delay={(i % 3) * 0.08} className="h-full">
                    <Link href={`/post/${post.id}`} className="block h-full">
                      <TiltCard className="rounded-2xl" max={7}>
                        <Card className="glass-card h-full cursor-pointer rounded-2xl transition-shadow hover:shadow-2xl">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2" style={{ transform: 'translateZ(24px)' }}>
                              <div className="flex-1">
                                <h3 className="mb-1 text-lg font-semibold leading-tight">{post.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={post.profile?.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <span>{post.profile?.display_name || 'Anonymous'}</span>
                                  {post.profile?.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                                </div>
                              </div>
                              <Badge variant="secondary">{getWorkTypeLabel(post.work_type)}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {post.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{post.location}</span>}
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(post.created_at)}</span>
                              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</span>
                            </div>
                            {post.skills && post.skills.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {post.skills.slice(0, 3).map(skill => <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>)}
                                {post.skills.length > 3 && <Badge variant="outline" className="text-xs">+{post.skills.length - 3}</Badge>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TiltCard>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* People */}
        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              id="home.people"
              eyebrow="Talent"
              title="People ready"
              accent="to contribute."
              sub="People who have posted that they're looking for work."
              action={
                <Link href="/find-people" className="hidden items-center text-sm font-medium text-primary hover:underline sm:flex">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              }
            />
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : seekers.length === 0 ? (
              <Reveal>
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                    <Users className="mb-3 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No one has posted that they&apos;re looking for work yet. Be the first!</p>
                    <Button className="mt-4" onClick={() => router.push('/post/find-job')}>I&apos;m looking for work</Button>
                  </CardContent>
                </Card>
              </Reveal>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {seekers.map((post, i) => (
                  <Reveal key={post.id} delay={i * 0.08} className="h-full">
                    <Link href={`/post/${post.id}`} className="block h-full">
                      <TiltCard className="rounded-2xl" max={12}>
                        <Card className="glass-card h-full cursor-pointer rounded-2xl transition-shadow hover:shadow-2xl">
                          <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                              <div style={{ transform: 'translateZ(40px)' }}>
                                <Avatar className="mb-3 h-16 w-16 ring-4 ring-primary/10">
                                  <AvatarImage src={post.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xl">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex items-center gap-1" style={{ transform: 'translateZ(20px)' }}>
                                <h3 className="font-semibold">{post.profile?.display_name || 'Anonymous'}</h3>
                                {post.profile?.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.title}</p>
                              {post.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{post.location}</p>}
                              {post.skills && post.skills.length > 0 && (
                                <div className="mt-3 flex flex-wrap justify-center gap-1">
                                  {post.skills.slice(0, 3).map(skill => <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TiltCard>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading id="home.categories" eyebrow="Categories" title="Explore work" accent="across industries." />
            {categories.length === 0 ? (
              <Reveal><p className="text-muted-foreground">Categories will appear here once they&apos;re added.</p></Reveal>
            ) : (
              <div className="border-t">
                {categories.map((cat, i) => (
                  <Reveal key={cat.id} delay={Math.min(i, 6) * 0.04} blur={false} distance={24}>
                    <Link href={`/find-work?category=${cat.slug}`} className="group relative flex items-center justify-between overflow-hidden border-b py-6 sm:py-8">
                      <span className="absolute inset-0 origin-bottom scale-y-0 gradient-bg opacity-100 transition-transform duration-500 ease-out group-hover:scale-y-100" />
                      <span className="relative flex items-baseline gap-4 px-2 transition-all duration-500 group-hover:translate-x-4 group-hover:text-white sm:gap-8">
                        <span className="text-sm tabular-nums text-muted-foreground transition-colors group-hover:text-white/70">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-3xl font-bold tracking-tight sm:text-5xl">{cat.name}</span>
                      </span>
                      <span className="relative mr-2 flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-500 group-hover:rotate-45 group-hover:border-white/60 group-hover:text-white">
                        <ArrowUpRight className="h-5 w-5" />
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust & Safety */}
        <section className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-14 lg:grid-cols-2">
              <div className="lg:sticky lg:top-28">
                <Reveal>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> <Editable id="home.trust.pill">{'Trust & Safety'}</Editable>
                  </div>
                </Reveal>
                <WordReveal lines={[{ text: 'Built with', id: 'home.trust.title' }, { text: 'safety in mind.', className: 'gradient-text', id: 'home.trust.accent' }]} className="mb-5 text-4xl font-bold tracking-tight sm:text-5xl" />
                <Reveal delay={0.15}>
                  <Editable as="p" multiline id="home.trust.sub" className="mb-8 block max-w-md text-muted-foreground">We take your safety seriously. Every post and profile can be reported, and our moderation team reviews content to keep the community trustworthy.</Editable>
                  <Button variant="outline" onClick={() => router.push('/safety')}>
                    <Editable id="home.trust.cta">Learn more about safety</Editable> <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Reveal>
              </div>

              <div className="space-y-4">
                {[
                  { icon: BadgeCheck, title: 'Verification badges', desc: 'Look for verified profiles and businesses.' },
                  { icon: ShieldCheck, title: 'Report & block', desc: 'Report suspicious content and block unwanted users.' },
                  { icon: MessageSquare, title: 'Stay on platform', desc: 'Keep communications on Workivo for your safety.' },
                  { icon: Zap, title: 'Age-aware protections', desc: 'Special safeguards for users under 18.' },
                ].map((item, i) => (
                  <Reveal key={item.title} delay={i * 0.06} direction="left">
                    <TiltCard className="rounded-2xl" max={5}>
                      <div className="flex items-start gap-4 rounded-2xl border bg-background p-6 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-bg text-white" style={{ transform: 'translateZ(30px)' }}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <div style={{ transform: 'translateZ(15px)' }}>
                          <Editable as="h3" id={`home.trust.item${i + 1}.title`} className="block font-semibold">{item.title}</Editable>
                          <Editable as="p" multiline id={`home.trust.item${i + 1}.desc`} className="text-sm text-muted-foreground">{item.desc}</Editable>
                        </div>
                      </div>
                    </TiltCard>
                  </Reveal>
                ))}

                <Reveal delay={0.1}>
                  <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-emerald-400/5 p-6">
                    <div className="space-y-3">
                      {[
                        'Never pay someone to get a job',
                        'Avoid sharing sensitive personal information',
                        'Meet safely in public when applicable',
                        'Report suspicious behavior immediately',
                      ].map((tip, ti) => (
                        <div key={tip} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                          <Editable id={`home.trust.tip${ti + 1}`} className="text-sm">{tip}</Editable>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] gradient-bg px-6 py-20 text-center text-white sm:px-12">
            {/* CSS 3D rings */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ perspective: 900 }} aria-hidden>
              <div className="spin-3d absolute h-[520px] w-[520px] rounded-full border-2 border-white/25" />
              <div className="spin-3d-reverse absolute h-[360px] w-[360px] rounded-full border-2 border-white/30" />
              <div className="spin-3d absolute h-[700px] w-[700px] rounded-full border border-white/15" />
            </div>
            <div className="float-slow absolute left-[8%] top-[18%] h-16 w-16 rounded-2xl bg-white/15 backdrop-blur" style={{ ['--tilt' as string]: '-12deg' }} aria-hidden />
            <div className="float-slower absolute bottom-[16%] right-[9%] h-12 w-12 rounded-full bg-white/20 backdrop-blur" aria-hidden />

            <div className="relative">
              <WordReveal as="h2" lines={[{ text: 'Ready to get started?', id: 'home.cta.title' }]} className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl" />
              <Reveal delay={0.2}>
                <Editable as="p" multiline id="home.cta.sub" className="mx-auto mb-8 block max-w-xl text-white/85">{"Join Workivo today. It's free to create an account, post opportunities, and apply."}</Editable>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Magnetic>
                    <Button size="lg" variant="secondary" className="h-12 px-8 text-primary shadow-xl" onClick={() => router.push('/signup')}>
                      <Editable id="home.cta.btn1">Sign Up Free</Editable>
                    </Button>
                  </Magnetic>
                  <Magnetic>
                    <Button size="lg" variant="outline" className="h-12 border-white/40 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white" onClick={() => router.push('/find-work')}>
                      <Editable id="home.cta.btn2">Browse Opportunities</Editable>
                    </Button>
                  </Magnetic>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </SmoothScroll>
  );
}