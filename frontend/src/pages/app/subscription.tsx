import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, QrCode } from "lucide-react";
import { membershipApi, Plan } from "@/api/membership";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentRemark, setPaymentRemark] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const data = await membershipApi.getPlans();
        setPlans(data);
        if (data.length > 0) {
          setSelectedPlanId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch plans", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubmit = async () => {
    if (!selectedPlanId || !paymentRemark.trim()) return;

    setSubmitting(true);
    try {
      await membershipApi.createOrder({
        plan_id: selectedPlanId,
        payment_remark: paymentRemark,
      });
      setSuccess(true);
    } catch (error) {
      console.error("Failed to create order", error);
      alert(t("subscription.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>{t("subscription.success")}</CardTitle>
            <CardDescription className="mt-2">
              {t("subscription.success_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/app/chat")}>
              {t("common.confirm")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t("subscription.title")}</h1>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        {/* Intro */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{t("subscription.desc")}</h2>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t("subscription.select_plan")}
          </h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t("common.loading")}</div>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`
                    relative p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedPlanId === plan.id 
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                      : "border-gray-200 bg-white hover:border-gray-300"}
                  `}
                >
                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <h4 className="font-bold text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-indigo-600">${plan.price}</span>
                      <span className="text-xs text-gray-500 block">/ {plan.duration_days} days</span>
                    </div>
                  </div>
                  {selectedPlanId === plan.id && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method - QR Code Placeholder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              {t("subscription.scan_qr")}
            </CardTitle>
            <CardDescription>
              {t("subscription.qr_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-center max-w-[280px] mx-auto">
              <img 
                src="/wechat-pay.jpg" 
                alt="WeChat Pay QR Code" 
                className="w-full h-auto rounded-lg"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t("subscription.transaction_id")}
              </label>
              <Input
                placeholder={t("subscription.transaction_id_placeholder")}
                value={paymentRemark}
                onChange={(e) => setPaymentRemark(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          className="w-full h-12 text-lg" 
          disabled={submitting || !selectedPlanId || !paymentRemark.trim()}
          onClick={handleSubmit}
        >
          {submitting ? t("subscription.submitting") : t("subscription.submit")}
        </Button>
      </div>
    </div>
  );
}
