import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FunilXPTO from "@/pages/FunilXPTO";
import MapaGeografico from "@/pages/MapaGeografico";
import "@/styles/csAnalisesFunilPremiumV1.css";
import "@/styles/csGeoAnalisesExecutive.css";

const ABAS = ["funil", "geografico"] as const;
type Aba = (typeof ABAS)[number];

export default function AnalisesDetalhes() {
  const [params, setParams] = useSearchParams();
  const valor = params.get("tab");
  const aba: Aba = valor === "geografico" ? "geografico" : "funil";

  return (
    <div className="cs-analises-premium-v1 space-y-6 min-w-0 pb-8">
      <header className="cs-analises-header-v1">
        <h1>
          <span className="cs-analises-title-white">Análises e</span>{" "}
          <span className="cs-analises-title-red">Detalhes</span>
        </h1>
        <p>INTELIGÊNCIA COMERCIAL E ANÁLISE DE DESEMPENHO</p>
      </header>

      <Tabs
        value={aba}
        onValueChange={(value) =>
          setParams({ tab: value }, { replace: true })
        }
        className="cs-analises-tabs-v1 space-y-5"
      >
        <TabsList className="h-auto flex flex-wrap justify-start gap-2 bg-transparent p-0">
          {/* cs-analises-tabs-executivo-v1 | cs-tipografia-executiva-v1 */}
          <TabsTrigger value="funil" className="relative cursor-pointer rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-semibold transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Funil XPTO</TabsTrigger>
          <TabsTrigger value="geografico" className="relative cursor-pointer rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-semibold transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Geográfico</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <FunilXPTO />
        </TabsContent>

        <TabsContent value="geografico">
          <div className="cs-geo-analises-exec-v1">
            <MapaGeografico formatarKpisAnalises />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
