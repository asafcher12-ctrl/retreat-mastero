import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = new URLSearchParams(window.location.search).get("next") || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setError("הכנס אימייל תקין וסיסמה בת 6 תווים לפחות");
      return;
    }

    setLoading(true);
    try {
      const result = await base44.auth.register({ email: trimmedEmail, password });
      if (result?.session?.access_token) {
        base44.auth.setToken(result.session.access_token);
      }
      try { localStorage.setItem('just_registered', '1'); } catch (e) {}
      window.location.href = next;
    } catch (err) {
      setError(err.message || "ההרשמה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="יצירת חשבון"
      subtitle="הצטרפו לניהול האירוע"
    >
      <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
        <span className="text-sm text-stone-600">כבר יש לכם חשבון? </span>
        <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-sm text-emerald-600 font-medium hover:underline">
          התחברו
        </Link>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-stone-600">אימייל</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-stone-600">סיסמה</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-12"
              required
              minLength={6}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              יוצר חשבון...
            </>
          ) : (
            "צרו חשבון"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}