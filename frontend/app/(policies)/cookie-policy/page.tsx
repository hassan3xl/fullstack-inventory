"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, Mail, Info } from "lucide-react";
import HomeFooter from "@/components/layout/HomeFooter";
import HomeNavbar from "@/components/layout/HomeNavbar";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between overflow-hidden">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Header */}
      <HomeNavbar prop="Cookie Policy" />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 relative z-10">
        <div className="bg-card/30 backdrop-blur-lg border border-border/50 rounded-2xl p-6 md:p-10 shadow-xl shadow-background/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Cookie size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Cookie Policy
              </h1>
              <p className="text-sm text-muted-foreground">
                Last updated: June 3, 2026
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">1.</span> What Are
                Cookies?
              </h2>
              <p className="leading-relaxed">
                Cookies are small text files that are stored on your computer or
                mobile device when you visit a website. They are widely used to
                make websites work or run more efficiently, as well as to
                provide reporting information and personalize your user
                experience.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">2.</span> How We Use
                Cookies
              </h2>
              <p className="leading-relaxed">
                We use cookies for a variety of reasons detailed below.
                Unfortunately, in most cases, there are no industry standard
                options for disabling cookies without completely disabling the
                functionality and features they add to this site. It is
                recommended that you leave all cookies enabled if you are unsure
                whether you need them or not.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">3.</span> The Cookies We
                Set
              </h2>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong className="text-foreground">
                    Authentication & Session Cookies:
                  </strong>{" "}
                  We set cookies (e.g. `session_user` and
                  `session_access_token`) when you are logged in so that we can
                  remember your session. This prevents you from having to log in
                  every single time you visit a new page within the dashboard.
                  These cookies are cleared when you log out.
                </li>
                <li>
                  <strong className="text-foreground">
                    Site Preferences Cookies:
                  </strong>{" "}
                  In order to provide you with a premium experience on this
                  site, we provide the functionality to set your preferences for
                  how this site runs when you use it (e.g. Dark/Light Theme
                  preferences). To remember your preferences, we need to set
                  cookies so that this information can be called whenever you
                  interact with a page.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">4.</span> Managing &
                Disabling Cookies
              </h2>
              <p className="leading-relaxed">
                You can prevent the setting of cookies by adjusting the settings
                on your browser (see your browser Help menu for instructions).
                Be aware that disabling cookies will affect the functionality of
                this and many other websites that you visit. Disabling cookies
                will usually result in also disabling certain features of the
                platform (such as session state retention and login
                capabilities).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">5.</span> More
                Information
              </h2>
              <p className="leading-relaxed">
                Hopefully, this has clarified things for you. If there is
                something that you aren't sure whether you need or not, it's
                usually safer to leave cookies enabled in case it interacts with
                one of the features you use on our site. If you have any further
                questions, you can contact us:
              </p>
              <div className="flex items-center gap-2 mt-2 p-4 bg-muted/30 border border-border/30 rounded-lg">
                <Mail size={18} className="text-primary" />
                <span className="text-foreground">cookies@qstack.com.ng</span>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
