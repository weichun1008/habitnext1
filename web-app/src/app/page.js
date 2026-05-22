import MainApp from "@/components/MainApp";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
    return (
        <main className="min-h-screen">
            <ErrorBoundary>
                <MainApp />
            </ErrorBoundary>
        </main>
    );
}
