import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center space-x-2 mb-4">
                            <img
                                src="/logos/inova-blue.png"
                                alt="INOVA.AI"
                                className="h-6 w-auto"
                            />
                            <span className="font-bold text-lg tracking-tight text-gray-900">
                                INOVA.AI
                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Leading the AI Era with innovative solutions in pet health, pharmaceutical automation, and industrial simulation.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Services</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/sniff" className="hover:text-blue-600 transition-colors">Sniff by Hatch</Link></li>
                            <li><Link href="/sniff-hospital" className="hover:text-blue-600 transition-colors">Sniff for Hospital</Link></li>
                            <li><Link href="/csv-automation" className="hover:text-blue-600 transition-colors">CSV 자동화</Link></li>
                            <li><Link href="/fem-ai" className="hover:text-blue-600 transition-colors">FEM & AI</Link></li>
                            <li><Link href="/automation" className="hover:text-blue-600 transition-colors">업무자동화</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
                            <li><Link href="/technology" className="hover:text-blue-600 transition-colors">Technology</Link></li>
                            <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">Contact Info</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>Seoul, South Korea</li>
                            <li>contact@inovaai.ai</li>
                            <li>+82 02-1234-5678</li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:row items-center justify-between gap-4">
                    <p className="text-gray-400 text-xs text-center md:text-left">
                        © {new Date().getFullYear()} INOVA.AI. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-xs text-gray-400">
                        <Link href="https://inovaai.ai/privacy" className="hover:text-gray-600">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
