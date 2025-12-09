import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/overview");
    }
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const emailValidation = z.string().email("Email inválido").safeParse(email);
    if (!emailValidation.success) {
      toast({
        title: "Erro de validação",
        description: emailValidation.error.errors[0].message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsForgotPassword(false);
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          let message = error.message;
          if (error.message.includes("already registered")) {
            message = "Este email já está cadastrado. Tente fazer login.";
          }
          toast({
            title: "Erro no cadastro",
            description: message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Verifique seu email para confirmar o cadastro.",
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          let message = error.message;
          if (error.message.includes("Invalid login credentials")) {
            message = "Email ou senha incorretos.";
          }
          toast({
            title: "Erro no login",
            description: message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login realizado com sucesso",
            description: "Bem-vindo ao Dengo Analytics",
          });
          navigate("/overview");
        }
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Dengo Analytics</CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestão Financeira - França
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Carregando..." : isSignUp ? "Cadastrar" : "Entrar"}
              </Button>
              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-muted-foreground hover:underline"
                  disabled={isLoading}
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline"
                  disabled={isLoading}
                >
                  {isSignUp ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
