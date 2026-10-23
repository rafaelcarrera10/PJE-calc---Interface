import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { IndicadorMotor } from './componentes/IndicadorMotor';
import { ListaCalculos } from './paginas/ListaCalculos';
import { Editor } from './paginas/Editor';

export function App() {
  return (
    <div className="app">
      <header className="cabecalho">
        <Link to="/" className="marca">
          <span className="marca-icone" aria-hidden>R$</span>
          <span>PJE Calc <strong>Fácil</strong></span>
        </Link>
        <IndicadorMotor />
      </header>
      <Routes>
        <Route path="/" element={<ListaCalculos />} />
        <Route path="/calculos/:id" element={<Navigate to="processo" replace />} />
        <Route path="/calculos/:id/:etapa" element={<Editor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="rodape">
        Ferramenta pessoal de apoio. Quem calcula é o PJe-Calc Cidadão oficial; confira sempre o resultado.
        Sem vínculo com CSJT, TST ou TRT8.
      </footer>
    </div>
  );
}
