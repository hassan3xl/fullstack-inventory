import ProfileSetupForm from "@/components/auth/ProfileSetupForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Setup",
  description: "Complete your profile setup to get started.",
};

export default function ProfileSetupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen py-10">
      <ProfileSetupForm />
    </div>
  );
}
