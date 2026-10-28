"use client";

import { Camera, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { FormField } from "@/components/auth/auth-shell";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { UploadError, uploadImage } from "@/lib/upload-client";
import { setAvatar, updateProfile } from "@/server/actions/profile";

export function ProfileForm({ name, username, avatarUrl, photosEnabled }: { name: string; username: string; avatarUrl: string | null; photosEnabled: boolean }) {
  const [state, action] = useActionState(updateProfile, null);
  const [preview, setPreview] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setAvatarError(null);
    try {
      const key = await uploadImage(file, "avatar");
      const result = await setAvatar(key);
      if (result.error) throw new UploadError(result.error);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setAvatarError(err instanceof UploadError ? err.message : "Foto konnte nicht hochgeladen werden.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-5 pt-3">
      <div className="flex items-center gap-4">
        <Avatar name={name} imageUrl={preview} size={80} highlight className="!border-2 text-3xl" />
        {photosEnabled ? (
          <div className="flex flex-col gap-1.5">
            <label className="btn btn-secondary h-11 cursor-pointer px-3 text-sm focus-within:outline-3 focus-within:outline-accent">
              {uploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
              Foto ändern
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void onAvatar(e.target.files?.[0])} />
            </label>
            {preview ? (
              <button
                type="button"
                className="cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] font-bold text-accent"
                onClick={async () => {
                  await setAvatar(null);
                  setPreview(null);
                }}
              >
                Foto entfernen
              </button>
            ) : null}
            {avatarError ? <span className="text-[13px] text-accent">{avatarError}</span> : null}
          </div>
        ) : null}
      </div>

      <form action={action} className="card flex flex-col gap-3.5 p-4">
        <FormField
          id="username"
          label="Username"
          defaultValue={username}
          autoCapitalize="none"
          spellCheck={false}
          hint="3–24 Zeichen: a–z, 0–9, Punkt oder Unterstrich"
          error={state?.fieldErrors?.username}
          required
        />
        {state?.ok ? (
          <p role="status" className="m-0 text-sm font-bold">
            Gespeichert.
          </p>
        ) : null}
        <SubmitButton pendingLabel="Speichern …">Speichern</SubmitButton>
      </form>
    </div>
  );
}
