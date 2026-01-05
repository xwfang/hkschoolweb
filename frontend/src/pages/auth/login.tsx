import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const getFormattedIdentifier = (input: string) => {
    // Basic check for HK phone number: 8 digits starting with 4, 5, 6, 7, 8, 9
    // If it matches, we assume it's a HK number and prepend +852
    const hkPhoneRegex = /^[4-9]\d{7}$/;
    if (hkPhoneRegex.test(input)) {
      return `+852${input}`;
    }
    return input;
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      setStep("otp");
      setError("");
    },
    onError: () => {
      setError(t('auth.send_otp_error'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verify,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      localStorage.setItem("token", data.token); // Keep for axios interceptor
      navigate("/app");
    },
    onError: () => {
      setError(t('auth.verify_error'));
    },
  });

  const handleSendOtp = () => {
    if (!phone) return;
    const identifier = getFormattedIdentifier(phone);
    loginMutation.mutate(identifier);
  };

  const handleLogin = () => {
    if (!otp) return;
    const identifier = getFormattedIdentifier(phone);
    verifyMutation.mutate({ identifier, code: otp });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.login_title')}</CardTitle>
        <CardDescription>
          {step === "phone" ? t('auth.phone_step_desc') : t('auth.otp_step_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        {step === "phone" ? (
          <Input 
            type="tel" 
            placeholder={t('auth.phone_placeholder')} 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loginMutation.isPending}
          />
        ) : (
          <Input 
            type="text" 
            placeholder={t('auth.otp_placeholder')} 
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={verifyMutation.isPending}
          />
        )}
      </CardContent>
      <CardFooter>
        {step === "phone" ? (
          <Button 
            className="w-full" 
            onClick={handleSendOtp} 
            disabled={!phone || loginMutation.isPending}
          >
            {loginMutation.isPending ? t('auth.sending') : t('auth.send_code')}
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleLogin} 
            disabled={!otp || verifyMutation.isPending}
          >
             {verifyMutation.isPending ? t('auth.logging_in') : t('auth.login')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
