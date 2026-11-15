export async function copyLink(path: string) {
  await navigator.clipboard.writeText(new URL(path, location.origin).href);
}

export async function shareLink(title: string, path: string) {
  const url = new URL(path, location.origin).href;
  if (navigator.share) {
    try { await navigator.share({ title, text: title, url }); return "Compartilhado."; }
    catch (e) { if ((e as Error).name === "AbortError") return ""; throw e; }
  }
  await copyLink(path);
  return "Link copiado. Cole no Discord ou em outra plataforma.";
}

export async function downloadPng(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível gerar a imagem. Tente novamente.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/png")) throw new Error("A imagem recebida não é um PNG.");
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
