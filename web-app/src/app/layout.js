import "./globals.css";

export const metadata = {
    title: "Cofit Daily Health Tracker",
    description: "Track your daily health habits",
};

export default function RootLayout({ children }) {
    return (
        <html lang="zh-TW">
            <body className="font-sans antialiased">
                <div id="root">{children}</div>
            </body>
        </html>
    );
}
