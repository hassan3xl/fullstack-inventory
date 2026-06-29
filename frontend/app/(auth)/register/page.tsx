import RegisterForm from "@/components/auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create your account to start managing your inventory and sales.",
};

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen py-10">
      <RegisterForm />
    </div>
  );
}
