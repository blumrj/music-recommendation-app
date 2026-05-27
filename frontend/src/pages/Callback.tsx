import { ProgressBar } from "../components";

export default function Callback() {
  return (
    <main className="h-full overflow-auto relative bg-secondary p-md">
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <ProgressBar indeterminate label="One moment while we connect with Spotify" width="200px" />
      </div>
    </main>
  );
}