import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth";

import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      setStep("otp");
      setError("");
    },
    onError: () => {
      setError("发送验证码失败，请重试");
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
      setError("验证码错误或已过期");
    },
  });

  const handleSendOtp = () => {
    if (!phone) return;
    loginMutation.mutate(phone);
  };

  const handleLogin = () => {
    if (!otp) return;
    verifyMutation.mutate({ identifier: phone, code: otp });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>
          {step === "phone" ? "请输入手机号以接收验证码" : "请输入收到的验证码"}
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
            placeholder="香港手机号 (e.g. 91234567)" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loginMutation.isPending}
          />
        ) : (
          <Input 
            type="text" 
            placeholder="验证码 (e.g. 123456)" 
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
            {loginMutation.isPending ? "发送中..." : "发送验证码"}
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleLogin} 
            disabled={!otp || verifyMutation.isPending}
          >
             {verifyMutation.isPending ? "登录中..." : "登录"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
