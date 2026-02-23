export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-background py-8">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg text-muted-foreground">INOVA.AI</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
                        <a href="mailto:support@inovaai.ai" className="hover:text-cyan-400 transition-colors">Contact</a>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} InovaAI. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
