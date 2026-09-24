export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return <div className="pt-[env(safe-area-inset-top)]">{children}</div>
}