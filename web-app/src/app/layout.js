import "./globals.css";

export const metadata = {
    title: "Cofit Daily Health Tracker",
    description: "Track your daily health habits",
};

export default function RootLayout({ children }) {
    return (
        <html lang="zh-TW">
            <head>
                {/*
                  字體大小偏好 — 在 hydrate 前同步套用，避免閃爍。
                  與 src/lib/fontSize.js 的 STORAGE_KEY / 對應表保持一致。
                */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: "(function(){try{var v=localStorage.getItem('habitnext.fontSize');var m={standard:16,large:18,xlarge:20};var px=m[v];if(px)document.documentElement.style.fontSize=px+'px';}catch(e){}})();",
                    }}
                />
                {/*
                  Material Symbols Rounded — Google's variable icon font.
                  Loaded once at the document level so every page can use
                  <MaterialIcon name="restaurant" /> with no per-icon cost.
                  The four variation axes (opsz / wght / FILL / GRAD) ship
                  in a single woff2.
                */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,-25..200&display=swap"
                />
            </head>
            <body className="font-sans antialiased">
                <div id="root">{children}</div>
            </body>
        </html>
    );
}
