import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SleepSettings } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Регулярний вираз для формату часу HH:MM
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Define the form schema
const formSchema = z.object({
  requiredSleepMinutes: z.preprocess(
    (value) => parseInt(value as string, 10),
    z.number().max(1440, "Не може бути більше 24 годин").refine(
      (value) => value >= 1 || value <= -1,
      "Значення повинно бути додатнім для прямої вказівки хвилин або від'ємним для розрахунку середнього"
    )
  ),
  scheduledNapTime: z.union([
    z.string().regex(timeFormatRegex, "Час має бути в форматі ГГ:ХХ (наприклад, 14:30)"),
    z.string().max(0), // Empty string
    z.null(),
  ]).optional(),
  scheduledBedtime: z.union([
    z.string().regex(timeFormatRegex, "Час має бути в форматі ГГ:ХХ (наприклад, 20:00)"),
    z.string().max(0), // Empty string
    z.null(),
  ]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SleepSettingsForm() {
  const { toast } = useToast();
  
  // Query to fetch current settings
  const { data: settings, isLoading } = useQuery<SleepSettings | null>({ 
    queryKey: ['/api/settings/sleep'],
  });
  
  // Set up the form with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requiredSleepMinutes: settings?.requiredSleepMinutes || 720, // Default to 12 hours if no settings
      scheduledNapTime: settings?.scheduledNapTime || '',
      scheduledBedtime: settings?.scheduledBedtime || '',
    },
    values: {
      requiredSleepMinutes: settings?.requiredSleepMinutes || 720,
      scheduledNapTime: settings?.scheduledNapTime || '',
      scheduledBedtime: settings?.scheduledBedtime || '',
    }
  });
  
  // Mutation to save settings
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/settings/sleep", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/sleep'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      toast({
        title: "Налаштування збережено",
        description: "Нові налаштування сну успішно застосовані.",
      });
    },
    onError: (error) => {
      toast({
        title: "Помилка при збереженні",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };
  
  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Налаштування сну</CardTitle>
          <CardDescription>Завантаження...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Calculate the readable duration
  const requiredSleepDuration = formatDuration(form.watch("requiredSleepMinutes"));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Налаштування сну</CardTitle>
        <CardDescription>
          Установіть необхідну тривалість сну для дитини
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="requiredSleepMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Необхідна тривалість сну (хвилини)</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-1.5">
                      <Input type="number" {...field} min={-365} max={1440} />
                      <div className="text-sm text-muted-foreground">
                        {form.watch("requiredSleepMinutes") < 0 
                          ? `Використовувати середнє значення за ${Math.abs(form.watch("requiredSleepMinutes"))} днів`
                          : `Поточне значення: ${requiredSleepDuration}`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Введіть додатне число для явної вказівки хвилин, або від'ємне число (наприклад, -5) для розрахунку середнього значення сну за вказану кількість днів
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="pt-4 border-t mt-6">
              <h3 className="text-base font-medium mb-4">Запланований час сну</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledNapTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Час денного сну</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12:30" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Формат: ГГ:ХХ (наприклад, 12:30)
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="scheduledBedtime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Час нічного сну</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="20:00" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Формат: ГГ:ХХ (наприклад, 20:00)
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Збереження..." : "Зберегти налаштування"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}