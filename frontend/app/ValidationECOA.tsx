'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical, Search, ArrowLeft, FileCheck, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  isValid: boolean;
  data?: {
    ecoaNumber: string;
    customerName: string;
    sampleCode: string;
    testDate: string;
    parameters: string[];
    status: string;
  };
}

// Mock validation data
const mockEcoaData: Record<string, ValidationResult['data']> = {
  'ECOA-2024-001': {
    ecoaNumber: 'ECOA-2024-001',
    customerName: 'PT. ABC Industries',
    sampleCode: 'SMP-001-2024',
    testDate: '2024-01-15',
    parameters: ['pH', 'BOD', 'COD', 'TSS'],
    status: 'Valid',
  },
  'ECOA-2024-002': {
    ecoaNumber: 'ECOA-2024-002',
    customerName: 'PT. XYZ Manufacturing',
    sampleCode: 'SMP-002-2024',
    testDate: '2024-01-20',
    parameters: ['Heavy Metals', 'Turbidity', 'TDS'],
    status: 'Valid',
  },
  'ECOA-2024-003': {
    ecoaNumber: 'ECOA-2024-003',
    customerName: 'CV. Green Solutions',
    sampleCode: 'SMP-003-2024',
    testDate: '2024-02-01',
    parameters: ['Microbiological', 'E.coli', 'Coliform'],
    status: 'Valid',
  },
};

export default function ValidationECOA() {
  const [ecoaNumber, setEcoaNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [focusedField, setFocusedField] = useState(false);
  const { toast } = useToast();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ecoaNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an ECOA number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setValidationResult(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const data = mockEcoaData[ecoaNumber.toUpperCase()];
    
    setValidationResult({
      isValid: !!data,
      data: data,
    });
    
    setIsLoading(false);

    if (data) {
      toast({
        title: "ECOA Valid",
        description: `ECOA ${ecoaNumber} has been verified successfully.`,
      });
    } else {
      toast({
        title: "ECOA Not Found",
        description: "The ECOA number you entered could not be verified.",
        variant: "destructive",
      });
    }
  };

  const handleViewPDF = () => {
    toast({
      title: "Opening PDF",
      description: "The ECOA certificate PDF is being generated...",
    });
    // In a real app, this would open or download the PDF
  };

  const handleReset = () => {
    setEcoaNumber('');
    setValidationResult(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
              <FlaskConical className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">Validation ECOA</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter the ECOA number to verify certificate authenticity
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ecoa" className="text-sm font-medium">ECOA Number</Label>
                <div className={`relative transition-all duration-300 ${focusedField ? 'scale-[1.02]' : ''}`}>
                  <FileCheck className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300 ${focusedField ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Input
                    id="ecoa"
                    type="text"
                    placeholder="e.g., ECOA-2024-001"
                    value={ecoaNumber}
                    onChange={(e) => setEcoaNumber(e.target.value)}
                    onFocus={() => setFocusedField(true)}
                    onBlur={() => setFocusedField(false)}
                    disabled={isLoading}
                    className="pl-10 h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Demo: Try ECOA-2024-001, ECOA-2024-002, or ECOA-2024-003
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 font-medium gap-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Validate ECOA
                  </>
                )}
              </Button>
            </form>

            {/* Validation Result */}
            {validationResult && (
              <div className="animate-in slide-in-from-bottom-4 duration-300">
                {validationResult.isValid && validationResult.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">ECOA Valid</p>
                        <p className="text-sm text-green-600 dark:text-green-400">This certificate is authentic and verified.</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm text-foreground">Certificate Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">ECOA Number</p>
                          <p className="font-medium">{validationResult.data.ecoaNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                            {validationResult.data.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{validationResult.data.customerName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sample Code</p>
                          <p className="font-medium">{validationResult.data.sampleCode}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Test Date</p>
                          <p className="font-medium">{validationResult.data.testDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Parameters</p>
                          <p className="font-medium">{validationResult.data.parameters.length} tested</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        className="flex-1 h-10 gap-2"
                        onClick={handleViewPDF}
                      >
                        <FileText className="h-4 w-4" />
                        View PDF Certificate
                      </Button>
                      <Button 
                        variant="outline"
                        className="h-10"
                        onClick={handleReset}
                      >
                        New Search
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">ECOA Not Found</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          The ECOA number "{ecoaNumber}" could not be verified. Please check the number and try again.
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      className="w-full h-10"
                      onClick={handleReset}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Back to Login */}
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full h-11 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 LabFLow TUV Nord Indonesia. All rights reserved.
        </p>
      </div>
    </div>
  );
}
