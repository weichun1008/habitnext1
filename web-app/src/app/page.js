import MainApp from "@/components/MainApp";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
            <ErrorBoundary>
                <MainApp />
            </ErrorBoundary>
        </main>
    );
}
