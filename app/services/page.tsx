/** @format */

"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, DollarSign, Shield, Wallet, ArrowRight } from "lucide-react";
import NextImage from "next/image";
import LandingNavbar from "../../components/layout/LandingNavbar";
import LandingFooter from "../../components/layout/LandingFooter";
import { useStellarWallet } from "@/context/StellarWalletContext";
import Button from "../../components/ui/Button";

function FadeIn({
	children,
	delay = 0,
	className = "",
}: {
	children: React.ReactNode;
	delay?: number;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const obs = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					setVisible(true);
					obs.disconnect();
				}
			},
			{ threshold: 0.1 },
		);
		if (ref.current) obs.observe(ref.current);
		return () => obs.disconnect();
	}, []);
	return (
		<div
			ref={ref}
			className={className}
			style={{
				opacity: visible ? 1 : 0,
				transform: visible ? "translateY(0)" : "translateY(24px)",
				transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
			}}>
			{children}
		</div>
	);
}

export default function ServicesPage() {
	const router = useRouter();
	const { isSignedIn, isHydrated, isConnecting } = useStellarWallet();

	useEffect(() => {
		if (!isHydrated) return;
		if (isSignedIn) router.replace("/dashboard");
	}, [isSignedIn, isHydrated, router]);

	const handleConnect = () => {
		router.push("/onboarding");
	};

	if (isHydrated && isSignedIn) return null;

	return (
		<div className='min-h-screen bg-neutral-50 font-manrope overflow-x-hidden'>
			<LandingNavbar />

			{/* HERO */}
			<section className='pt-32 pb-20 relative overflow-hidden'>
				<div className='absolute inset-0 pointer-events-none'>
					<div className='absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl' />
				</div>
				<div className='px-6 lg:px-36'>
					<div className='text-center max-w-3xl mx-auto mb-16'>
						<div className='text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 animate-fadeIn'>
							Our Infrastructure
						</div>
						<h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.05] mb-6 animate-slideUp'>
							Decentralized Financial
							<br />
							<span className='text-primary'>Automation.</span>
						</h1>
						<p className='text-neutral-500 leading-relaxed'>
							Rubbi architects the next generation of capital flow. We replace
							manual friction with automated smart-contract logic on Stellar,
							ensuring your assets move with architectural precision.
						</p>
					</div>
				</div>
			</section>

			{/* STREAMING SUBSCRIPTIONS */}
			<section className='py-20 bg-white'>
				<div className='px-6 lg:px-36'>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
						<FadeIn>
							<div className='w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center mb-6'>
								<Calendar
									size={24}
									className='text-primary'
								/>
							</div>
							<h2 className='text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5'>
								Streaming Subscriptions
							</h2>
							<p className='text-neutral-500 leading-relaxed mb-6'>
								Continuous value transfer protocols for modern services. No more
								billing cycles — just on-time USDC settlement on Stellar that mirrors
								real-time consumption.
							</p>
							<div className='flex flex-wrap gap-2 mb-8'>
								<span className='px-3 py-1.5 bg-primary/8 text-primary text-xs font-semibold rounded-full'>
									Real-Time
								</span>
								<span className='px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-semibold rounded-full'>
									Automated
								</span>
							</div>
							<Button
								icon={<ArrowRight size={16} />}
								iconPosition='right'
								onClick={handleConnect}
								loading={isConnecting}>
								Get Started
							</Button>
						</FadeIn>
						<FadeIn delay={150}>
							<div className='bg-neutral-50 rounded-2xl p-8 border border-neutral-100 space-y-4'>
								{[
									{
										name: "Netflix Premium",
										amount: "15.99",
										status: "active",
										logo: "/subscriptions/netflix.svg",
									},
									{
										name: "Spotify Family",
										amount: "9.99",
										status: "active",
										logo: "/subscriptions/spotify.svg",
									},
									{
										name: "AWS Cloud",
										amount: "71.52",
										status: "streaming",
										logo: "/subscriptions/aws.svg",
									},
								].map((s) => (
									<div
										key={s.name}
										className='bg-white rounded-xl p-4 flex items-center justify-between border border-neutral-100'>
										<div className='flex items-center gap-3'>
											<div className='relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0'>
												<NextImage
													src={s.logo}
													alt={`${s.name} logo`}
													fill
													className='object-cover'
													sizes='40px'
												/>
											</div>
											<div>
												<p className='font-semibold text-neutral-800 text-sm'>
													{s.name}
												</p>
												<p className='text-xs text-neutral-400 capitalize'>
													Status: {s.status}
												</p>
											</div>
										</div>
										<div className='text-right'>
											<p className='font-bold text-primary'>{s.amount}</p>
											<p className='text-xs text-neutral-400'>USDC / mo</p>
										</div>
									</div>
								))}
							</div>
						</FadeIn>
					</div>
				</div>
			</section>

			{/* ON-CHAIN IDENTITY */}
			<section className='py-20 bg-primary text-white'>
				<div className='px-6 lg:px-36'>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
						<FadeIn delay={150}>
							<div className='bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10'>
								<div className='bg-white/10 rounded-xl p-5 mb-4'>
									<p className='text-xs text-white/50 mb-1'>
										RUBBI VIRTUAL CARD
									</p>
									<p className='font-mono text-white text-lg tracking-widest'>
										•••• •••• •••• 1290
									</p>
									<div className='flex gap-6 mt-3'>
										<div>
											<p className='text-xs text-white/40'>VALID THRU</p>
											<p className='text-sm font-semibold'>12/28</p>
										</div>
										<div>
											<p className='text-xs text-white/40'>NETWORK</p>
											<p className='text-sm font-semibold'>Stellar</p>
										</div>
									</div>
									<p className='mt-3 text-sm font-semibold'>@username</p>
								</div>
								<p className='text-xs text-white/50'>
									Your identity card powers subscription payments across the
									Rubbi ecosystem.
								</p>
							</div>
						</FadeIn>
						<FadeIn>
							<div className='w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6'>
								<Shield
									size={24}
									className='text-white'
								/>
							</div>
							<h2 className='text-3xl lg:text-4xl font-extrabold mb-5'>
								On-Chain Identity
							</h2>
							<p className='text-white/70 leading-relaxed mb-6'>
								Your reputation is your most valuable asset. Aggregate your
								cross-chain activity into a single, verifiable on-chain ledger. Your
								Rubbi identity is your permanent digital fingerprint on Stellar.
							</p>
							<Link
								href='#'
								className='inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold text-sm transition-colors'>
								Learn more <ArrowRight size={14} />
							</Link>
						</FadeIn>
					</div>
				</div>
			</section>

			{/* SALARY STREAMING */}
			<section className='py-20 bg-white'>
				<div className='px-6 lg:px-36'>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center'>
						<FadeIn>
							<div className='w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center mb-6'>
								<DollarSign
									size={24}
									className='text-primary'
								/>
							</div>
							<h2 className='text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5'>
								Salary Streaming
							</h2>
							<p className='text-neutral-500 leading-relaxed mb-6'>
								Empower your workforce with immediate liquidity on-chain. Salary
								Streaming enables employees to access their earnings as they
								accrue on Stellar, eliminating the bi-weekly wait and fostering
								financial sovereignty.
							</p>
							<div className='grid grid-cols-3 gap-4 sm:gap-6 mb-8'>
								<div>
									<p className='text-2xl font-extrabold text-primary'>0%</p>
									<p className='text-xs text-neutral-400 uppercase tracking-wider mt-1'>
										Intermediary Fee
									</p>
								</div>
								<div>
									<p className='text-2xl font-extrabold text-primary'>24/7</p>
									<p className='text-xs text-neutral-400 uppercase tracking-wider mt-1'>
										Accessibility
									</p>
								</div>
								<div>
									<p className='text-2xl font-extrabold text-primary'>100%</p>
									<p className='text-xs text-neutral-400 uppercase tracking-wider mt-1'>
										Trustless
									</p>
								</div>
							</div>
						</FadeIn>
						<FadeIn delay={150}>
							<div className='bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100'>
								<div className='bg-neutral-800 p-3 flex gap-1.5'>
									<div className='w-3 h-3 rounded-full bg-red-400' />
									<div className='w-3 h-3 rounded-full bg-yellow-400' />
									<div className='w-3 h-3 rounded-full bg-green-400' />
								</div>
								<div className='p-6 font-mono text-sm space-y-2'>
									<p className='text-green-500'>$ rubbi stream create</p>
									<p className='text-neutral-400'>recipient: 0x4a...e89</p>
									<p className='text-neutral-400'>amount: 4,500 USDC / month</p>
									<p className='text-neutral-400'>interval: monthly</p>
									<p className='text-green-400 mt-3'>✓ Stream initiated</p>
									<p className='text-neutral-500'>Block #18,394,022</p>
									<p className='text-primary'>Next payout in 12 days</p>
								</div>
							</div>
						</FadeIn>
					</div>
				</div>
			</section>

			{/* BOTTOM CTA */}
			<section className='py-24 bg-neutral-50'>
				<div className='px-6 lg:px-36 text-center'>
					<FadeIn>
						<h2 className='text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5'>
							Ready to Architect Your Capital?
						</h2>
						<p className='text-neutral-500 mb-8'>
							Join builders and teams who have automated their financial
							future through Rubbi&apos;s on-chain ledger on Stellar.
						</p>
						<div className='flex flex-wrap justify-center gap-3'>
							<Button
								size='lg'
								icon={<Wallet size={18} />}
								loading={isConnecting}
								onClick={handleConnect}>
								Begin Automation
							</Button>
							<Link
								href="/docs"
								className='inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white rounded-xl text-base font-semibold border border-white/20 hover:bg-white/20 transition-all'>
								View Documentation
							</Link>
						</div>
					</FadeIn>
				</div>
			</section>

			<LandingFooter />
		</div>
	);
}
