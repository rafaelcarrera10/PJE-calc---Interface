import { CampoSelecao, CampoTexto, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';

/** 00001238520255040001 → 0000123-85.2025.5.04.0001 */
function mascaraCnj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 20);
  const partes = [d.slice(0, 7), d.slice(7, 9), d.slice(9, 13), d.slice(13, 14), d.slice(14, 16), d.slice(16, 20)];
  const sep = ['', '-', '.', '.', '.', '.'];
  return partes.reduce((acc, p, i) => (p ? acc + sep[i] + p : acc), '');
}
const soDigitos = (max: number) => (v: string) => v.replace(/\D/g, '').slice(0, max);

export function EtapaProcesso() {
  const { spec, alterar, catalogos } = useEditor();
  const p = spec.processo ?? {};
  const partes = spec.partes ?? {};
  return (
    <>
      <Secao titulo="Processo" descricao="Identifique o processo. O TRT define os feriados e as tabelas regionais usadas pelo PJe-Calc.">
        <Linha>
          <CampoTexto rotulo="Nome do cálculo" largura="g" valor={spec._titulo} placeholder="Ex.: Horas extras — cenário da sentença"
            ajuda="Só para você se localizar na lista. Não vai para o PJe-Calc." caminho="/_titulo"
            aoMudar={(v) => alterar((s) => { s._titulo = v; })} />
        </Linha>
        <Linha>
          <CampoTexto rotulo="Número do processo (CNJ)" valor={p.numero} placeholder="0000000-00.0000.5.00.0000" mascara={mascaraCnj}
            caminho="/processo/numero" ajuda="Digite só os números; a formatação é automática. O dígito verificador é conferido."
            aoMudar={(v) => alterar((s) => {
              s.processo = { ...s.processo, numero: v };
              const tr = v?.match(/\.5\.(\d{2})\./)?.[1];
              if (tr && !s.processo.regional) s.processo.regional = `TRT${Number(tr)}`;
            })} />
          <CampoSelecao rotulo="TRT" obrigatorio valor={p.regional} opcoes={catalogos.regionais} caminho="/processo/regional"
            aoMudar={(v) => alterar((s) => { s.processo = { ...s.processo, regional: v }; })} />
          <CampoTexto rotulo="Vara" valor={p.vara} placeholder="Ex.: 1ª Vara do Trabalho de Porto Alegre" caminho="/processo/vara"
            aoMudar={(v) => alterar((s) => { s.processo = { ...s.processo, vara: v }; })} />
        </Linha>
      </Secao>

      <Secao titulo="Partes" descricao="Nomes ajudam a encontrar o cálculo depois. CPF e CNPJ são opcionais — só preencha se precisar no relatório.">
        <Linha>
          <CampoTexto rotulo="Reclamante (trabalhador)" largura="g" valor={partes.reclamante?.nome} caminho="/partes/reclamante/nome"
            aoMudar={(v) => alterar((s) => { s.partes = { ...s.partes, reclamante: { ...s.partes?.reclamante, nome: v ?? '' } }; if (!v) delete s.partes.reclamante; })} />
          <CampoTexto rotulo="CPF do reclamante" valor={partes.reclamante?.cpf} mascara={soDigitos(11)} placeholder="Somente números" caminho="/partes/reclamante/cpf"
            aoMudar={(v) => alterar((s) => { if (s.partes?.reclamante) s.partes.reclamante.cpf = v; })} />
        </Linha>
        <Linha>
          <CampoTexto rotulo="Reclamado (empresa)" largura="g" valor={partes.reclamado?.nome} caminho="/partes/reclamado/nome"
            aoMudar={(v) => alterar((s) => { s.partes = { ...s.partes, reclamado: { ...s.partes?.reclamado, nome: v ?? '' } }; if (!v) delete s.partes.reclamado; })} />
          <CampoTexto rotulo="CNPJ do reclamado" valor={partes.reclamado?.cnpj} mascara={soDigitos(14)} placeholder="Somente números" caminho="/partes/reclamado/cnpj"
            aoMudar={(v) => alterar((s) => { if (s.partes?.reclamado) s.partes.reclamado.cnpj = v; })} />
        </Linha>
      </Secao>
    </>
  );
}
