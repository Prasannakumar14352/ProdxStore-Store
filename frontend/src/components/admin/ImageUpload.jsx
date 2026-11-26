import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, imgSrc } from "../../lib/api";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const uploadFile = async (file) => {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post("/admin/uploads", body);
  return data.url;
};

const useUploader = (onDone) => {
  const [busy, setBusy] = useState(false);
  const run = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadFile(file));
      onDone(urls);
      toast.success(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
};

const PickButton = ({ busy, multiple, onFiles, testid, label }) => {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept={ACCEPT} multiple={multiple} hidden data-testid={`${testid}-input`}
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ""; }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} data-testid={testid}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {label}
      </button>
    </>
  );
};

export const ImageUpload = ({ value, onChange }) => {
  const [busy, run] = useUploader((urls) => onChange(urls[0]));
  return (
    <div className="grid gap-2 text-sm font-medium">
      Cover image
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-input p-3">
        {value ? (
          <img src={imgSrc(value)} alt="Cover preview" className="h-20 w-32 rounded-lg object-cover" data-testid="product-form-cover-preview" />
        ) : (
          <span className="grid h-20 w-32 place-items-center rounded-lg bg-secondary text-muted-foreground"><ImagePlus className="h-6 w-6" /></span>
        )}
        <PickButton busy={busy} onFiles={run} testid="product-form-cover-upload" label={value ? "Replace image" : "Upload image"} />
        <span className="text-xs font-normal text-muted-foreground">JPG, PNG, WEBP or GIF · up to 8 MB</span>
      </div>
    </div>
  );
};

export const GalleryUpload = ({ value, onChange }) => {
  const [busy, run] = useUploader((urls) => onChange([...value, ...urls]));
  return (
    <div className="grid gap-2 text-sm font-medium">
      Gallery images
      <div className="rounded-xl border border-dashed border-input p-3">
        <ul className="flex flex-wrap gap-3">
          {value.map((src, i) => (
            <li key={`${src}-${i}`} className="relative" data-testid={`product-form-gallery-item-${i}`}>
              <img src={imgSrc(src)} alt={`Gallery ${i + 1}`} className="h-20 w-28 rounded-lg object-cover" />
              <button type="button" aria-label="Remove image" data-testid={`product-form-gallery-remove-${i}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-background text-foreground ring-1 ring-border hover:bg-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className={value.length ? "mt-3" : ""}>
          <PickButton busy={busy} multiple onFiles={run} testid="product-form-gallery-upload" label="Add images" />
        </div>
      </div>
    </div>
  );
};
