'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical, Loader2, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the forgot-password API
      await api.post('/auth/forgot-password', { email });

      setIsSubmitted(true);

      toast({
        title: "Email Sent",
        description: "If the email exists, you will receive password reset instructions.",
      });
    } catch (error: any) {
      // Even on error, show success message for security (prevent email enumeration)
      setIsSubmitted(true);
      toast({
        title: "Email Sent",
        description: "If the email exists, you will receive password reset instructions.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <FlaskConical className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
              <CardDescription className="text-muted-foreground">
                {isSubmitted
                  ? "Check your email for reset instructions"
                  : "Enter your email to receive a password reset link"
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSubmitted ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-medium text-foreground">Email Sent Successfully</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      If an account exists for <strong>{email}</strong>,
                      you will receive a password reset link shortly. Please check your inbox.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The link will expire in 1 hour.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      setIsSubmitted(false);
                      setEmail('');
                    }}
                  >
                    Try another email
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full h-11"
                  >
                    <Link href="/login" className="flex items-center justify-center">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className={`relative transition-all duration-300 ${focusedField ? 'scale-[1.02]' : ''}`}>
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${focusedField ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField(true)}
                        onBlur={() => setFocusedField(false)}
                        disabled={isLoading}
                        className="pl-10 h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="flex items-center justify-center">
                  <Button
                    asChild
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Link href="/login" className="flex items-center">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
