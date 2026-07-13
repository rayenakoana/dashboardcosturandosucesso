export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          created_at: string
          id: string
          mes_ref: string | null
          tipo: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_ref?: string | null
          tipo: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_ref?: string | null
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      custos_marketing: {
        Row: {
          categoria: string
          created_at: string
          data: string
          id: string
          nome_item: string
          produto: string | null
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data?: string
          id?: string
          nome_item: string
          produto?: string | null
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          id?: string
          nome_item?: string
          produto?: string | null
          valor?: number
        }
        Relationships: []
      }
      metricas_diarias: {
        Row: {
          compareceram_real: number
          created_at: string
          data: string
          funil: string
          id: string
          leads_qualificados: number
          leads_recebidos: number
          reunioes_agendadas: number
          reunioes_confirmadas: number
          sdr_id: string | null
        }
        Insert: {
          compareceram_real?: number
          created_at?: string
          data?: string
          funil: string
          id?: string
          leads_qualificados?: number
          leads_recebidos?: number
          reunioes_agendadas?: number
          reunioes_confirmadas?: number
          sdr_id?: string | null
        }
        Update: {
          compareceram_real?: number
          created_at?: string
          data?: string
          funil?: string
          id?: string
          leads_qualificados?: number
          leads_recebidos?: number
          reunioes_agendadas?: number
          reunioes_confirmadas?: number
          sdr_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "sdrs"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reunioes: {
        Row: {
          compareceram_real: number
          created_at: string
          data: string
          id: string
          sdr_confirmado: number
          sdr_estimado: number
        }
        Insert: {
          compareceram_real?: number
          created_at?: string
          data?: string
          id?: string
          sdr_confirmado?: number
          sdr_estimado?: number
        }
        Update: {
          compareceram_real?: number
          created_at?: string
          data?: string
          id?: string
          sdr_confirmado?: number
          sdr_estimado?: number
        }
        Relationships: []
      }
      sdrs: {
        Row: {
          ativo: boolean
          created_at: string
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          campanha: string | null
          created_at: string
          data_entrada: string
          data_fechamento: string | null
          empresa: string | null
          funil: string | null
          id: string
          is_renovacao: boolean
          motivo_perda: string | null
          nome_cliente: string
          origem: string | null
          produto: string | null
          responsavel: string | null
          segmento: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          campanha?: string | null
          created_at?: string
          data_entrada?: string
          data_fechamento?: string | null
          empresa?: string | null
          funil?: string | null
          id?: string
          is_renovacao?: boolean
          motivo_perda?: string | null
          nome_cliente: string
          origem?: string | null
          produto?: string | null
          responsavel?: string | null
          segmento?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          campanha?: string | null
          created_at?: string
          data_entrada?: string
          data_fechamento?: string | null
          empresa?: string | null
          funil?: string | null
          id?: string
          is_renovacao?: boolean
          motivo_perda?: string | null
          nome_cliente?: string
          origem?: string | null
          produto?: string | null
          responsavel?: string | null
          segmento?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rls_allow_all: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
