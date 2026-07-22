'use client'

import { useState, useRef } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveCompanyLogo } from '@/app/actions/admin/company'
import { C } from '@/components/platform/brand'

interface Props {
  companyId:      string
  currentLogoUrl: string | null
}

export default function LogoUpload({ companyId, currentLogoUrl }: Props) {
  const [preview,   setPreview]   = useState<string | null>(currentLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [err,       setErr]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setErr('Please Upload An Image File.'); return }
    if (file.size > 2 * 1024 * 1024)    { setErr('Max File Size Is 2 MB.');       return }

    setUploading(true)
    setErr(null)

    try {
      const supabase = createClient()
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `${companyId}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('company-logos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(path)

      await saveCompanyLogo(publicUrl)
      setPreview(publicUrl)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload Failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    setUploading(true)
    setErr(null)
    try {
      await saveCompanyLogo(null)
      setPreview(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed To Remove Logo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.white, display: 'block', marginBottom: 10 }}>
        Company Logo
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Preview */}
        <div style={{
          width: 110, height: 52, flexShrink: 0,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {preview
            ? <img src={preview} alt="Company logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <ImageIcon size={22} style={{ color: C.dimText }} />
          }
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
              padding: '6px 14px', borderRadius: 7,
              background: 'rgba(48,125,192,0.15)',
              border: '1px solid rgba(48,125,192,0.3)',
              color: C.blue, cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <Upload size={12} />
            {uploading ? 'Uploading…' : preview ? 'Change Logo' : 'Upload Logo'}
          </button>

          {preview && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600,
                padding: '6px 14px', borderRadius: 7,
                background: 'rgba(237,31,36,0.08)',
                border: '1px solid rgba(237,31,36,0.2)',
                color: C.red, cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 500, color: C.dimText, marginTop: 8 }}>
        PNG, JPG Or WebP, Max 2 MB. Replaces The KPI DRIVER Logo In The Sidebar For All Users In Your Company.
      </p>

      {err && (
        <p style={{ fontSize: 12, color: C.red, marginTop: 6, fontWeight: 500 }}>{err}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
