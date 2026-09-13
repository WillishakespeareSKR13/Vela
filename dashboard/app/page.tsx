// Pagina de servidor: solo inyecta la URL de senalizacion y monta el panel,
// que es de cliente porque vive de WebRTC y estado del navegador.
import { Dashboard } from "./Dashboard";

export default function Page() {
  const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080";
  return <Dashboard serverUrl={serverUrl} />;
}
