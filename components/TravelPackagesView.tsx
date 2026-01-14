
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { PackagePassenger, TravelPackage, Client } from '../types';

const TravelPackagesView: React.FC = () => {
  const { travelPackages, packagePassengers, packagePayments, clients, addTravelPackage, registerPackageSale, addPackagePayment, currentUser } = useStore();
  
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  const [showCommissionReport, setShowCommissionReport] = useState(false);
  
  // Create Package Form
  const [newPkg, setNewPkg] = useState({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });

  // Sale/Passenger Form State
  const [saleForm, setSaleForm] = useState({
      saleType: 'DIRECT' as 'DIRECT' | 'AGENCY',
      agencyName: '',
      agencyPhone: '',
      paxList: '', // Text area for Agency PAX names
      cpf: '',
      name: '',
      rg: '',
      birthDate: '',
      phone: '',
      address: '',
      qtdAdult: 0,
      qtdChild: 0,
      qtdSenior: 0,
      discount: 0
  });

  // Client History Modal
  const [viewHistoryClient, setViewHistoryClient] = useState<Client | null>(null);

  // Payment Modal
  const [selectedPassengerForPayment, setSelectedPassengerForPayment] = useState<PackagePassenger | null>(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'PIX', installments: 1, notes: '' });

  // --- Handlers ---

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPkg.title && newPkg.date) {
        addTravelPackage(newPkg);
        setShowNewPackageForm(false);
        setNewPkg({ title: '', date: '', adultPrice: 0, childPrice: 0, seniorPrice: 0 });
    }
  };

  const handleCpfBlur = () => {
      // Auto-fill client data if exists
      const found = clients.find(c => c.cpf === saleForm.cpf);
      if (found) {
          setSaleForm(prev => ({
              ...prev,
              name: found.name,
              rg: found.rg,
              birthDate: found.birthDate,
              phone: found.phone,
              address: found.address
          }));
      }
  };

  // Currency Handlers
  const handlePkgPriceChange = (field: 'adultPrice' | 'childPrice' | 'seniorPrice', valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setNewPkg(prev => ({ ...prev, [field]: realValue }));
  };

  const handleDiscountChange = (valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setSaleForm(prev => ({ ...prev, discount: realValue }));
  };

  const handlePaymentAmountChange = (valueStr: string) => {
      const digits = valueStr.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      setNewPayment(prev => ({ ...prev, amount: realValue }));
  };

  const handleRegisterSale = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedPackage) {
          // 1. Calculate Total
          const total = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                        (saleForm.qtdChild * selectedPackage.childPrice) +
                        (saleForm.qtdSenior * selectedPackage.seniorPrice);
          
          if (total <= 0) {
              alert("Por favor, selecione pelo menos um passageiro.");
              return;
          }

          // 2. Check Discount Authorization
          if (saleForm.discount > 0) {
              const authorized = window.confirm(
                  `ATENÇÃO: Você está aplicando um desconto de R$ ${saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.\n\n` + 
                  `Todo desconto deve ser AUTORIZADO pelo gestor.\n` + 
                  `Confirma que você possui esta autorização?`
              );
              if (!authorized) return;
          }

          const finalPrice = Math.max(0, total - saleForm.discount);

          // 3. Register
          registerPackageSale(
              {
                  name: saleForm.name, // Will be Client Name OR Agency Contact Person
                  cpf: saleForm.cpf,
                  rg: saleForm.rg,
                  birthDate: saleForm.birthDate,
                  phone: saleForm.phone,
                  address: saleForm.address
              },
              {
                  packageId: selectedPackage.id,
                  qtdAdult: saleForm.qtdAdult,
                  qtdChild: saleForm.qtdChild,
                  qtdSenior: saleForm.qtdSenior,
                  discount: saleForm.discount,
                  agreedPrice: finalPrice,
                  saleType: saleForm.saleType,
                  agencyName: saleForm.saleType === 'AGENCY' ? saleForm.agencyName : undefined,
                  agencyPhone: saleForm.saleType === 'AGENCY' ? saleForm.agencyPhone : undefined,
                  paxList: saleForm.saleType === 'AGENCY' ? saleForm.paxList : undefined
              }
          );

          // Reset
          setSaleForm({ 
              saleType: 'DIRECT', agencyName: '', agencyPhone: '', paxList: '',
              cpf: '', name: '', rg: '', birthDate: '', phone: '', address: '', qtdAdult: 0, qtdChild: 0, qtdSenior: 0, discount: 0 
          });
          alert("Venda registrada com sucesso!");
      }
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if(selectedPassengerForPayment && newPayment.amount > 0) {
          addPackagePayment({
              passengerId: selectedPassengerForPayment.id,
              amount: newPayment.amount,
              date: newPayment.date,
              method: newPayment.method as any,
              installments: newPayment.installments,
              notes: newPayment.notes
          });
          setSelectedPassengerForPayment(null);
          setNewPayment({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'PIX', installments: 1, notes: '' });
          alert('Pagamento registrado com sucesso!');
      }
  };

  const getPaymentProgress = (paid: number, total: number) => {
      if(total === 0) return 0;
      return Math.min(100, (paid / total) * 100);
  };

  // --- PRINT FUNCTIONS ---

  const handlePrintReceipt = (passenger: PackagePassenger) => {
      const client = clients.find(c => c.id === passenger.clientId);
      const pkg = travelPackages.find(p => p.id === passenger.packageId);
      if (!client || !pkg) return;

      const remaining = passenger.agreedPrice - passenger.paidAmount;
      const statusText = remaining <= 0 ? "TOTAL" : "PARCIAL";
      
      const printContent = `
        <html><head><title>Recibo - ${passenger.titularName}</title>
        <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; font-size: 12px; }
            .receipt-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
            .logo { font-size: 24px; font-weight: bold; font-style: italic; color: #1e3a8a; }
            .logo span { font-size: 10px; background: #1e3a8a; color: white; padding: 2px 5px; margin-left: 5px; font-style: normal; }
            .receipt-title { font-size: 18px; font-weight: bold; text-align: right; }
            .receipt-value { border: 1px solid #ccc; padding: 5px 15px; font-size: 16px; font-weight: bold; background: #f9f9f9; }
            .row { display: flex; margin-bottom: 8px; align-items: baseline; }
            .label { font-weight: bold; width: 100px; }
            .value { flex: 1; border-bottom: 1px dotted #999; padding-left: 5px; }
            .box-info { border: 1px solid #ccc; padding: 10px; background: #f0f0f0; margin: 10px 0; font-size: 11px; }
            .signature { margin-top: 40px; text-align: right; }
            .signature-line { border-top: 1px solid #000; width: 250px; display: inline-block; text-align: center; padding-top: 5px; }
        </style>
        </head><body>
            <div class="receipt-box">
                <div class="header">
                    <div class="logo">
                        Rabelo Tour
                        <span>Desde 1992</span>
                    </div>
                    <div style="text-align: right;">
                        <div class="receipt-title">RECIBO</div>
                        <div style="font-size: 10px; color: #666;">CÓDIGO: ${passenger.id.slice(0,6).toUpperCase()}</div>
                    </div>
                    <div class="receipt-value">
                        R$ ${passenger.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </div>
                </div>

                <div class="row">
                    <span class="label">Cliente:</span>
                    <span class="value">${client.name} ${passenger.saleType === 'AGENCY' ? `(Agência: ${passenger.agencyName})` : ''}</span>
                </div>
                <div class="row">
                    <span class="label">CPF/CNPJ:</span>
                    <span class="value">${client.cpf}</span>
                    <span class="label" style="width: auto; margin-left: 20px;">Telefone:</span>
                    <span class="value">${client.phone || '-'}</span>
                </div>
                <div class="row">
                    <span class="label">Endereço:</span>
                    <span class="value">${client.address || '-'}</span>
                </div>

                <div class="box-info">
                    <strong>Histórico / Referência:</strong><br/>
                    Pagamento ${statusText} referente ao pacote turístico: <strong>${pkg.title}</strong><br/>
                    Data da Viagem: ${new Date(pkg.date).toLocaleDateString()}<br/>
                    Passageiros: ${passenger.qtdAdult} Ad, ${passenger.qtdChild} Cri, ${passenger.qtdSenior} Ido.
                </div>

                <div class="row">
                    <span class="label">Recebemos a quantia de:</span>
                    <span class="value" style="font-style: italic;">(Valor numérico acima)</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; border: 1px solid #eee; padding: 10px;">
                    <div>
                        <strong>Valor Total Pacote:</strong> R$ ${passenger.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br/>
                        <strong>Total Pago:</strong> R$ ${passenger.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br/>
                        <strong>Saldo Restante:</strong> R$ ${remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </div>
                    <div>
                        <strong>Data do Recibo:</strong> ${new Date().toLocaleDateString()}<br/>
                        <strong>Responsável:</strong> ${currentUser.name}
                    </div>
                </div>

                <div class="signature">
                    <div class="signature-line">
                        Rabelo Tour<br/>
                        <span style="font-size: 9px;">Assinatura Autorizada</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px; font-size: 9px; color: #888; text-align: center;">
                    Petrópolis - RJ | Contato: (24) 2237-4990 / 98824-9204
                </div>
            </div>
            <script>window.print();</script>
        </body></html>
      `;
      const win = window.open('', '', 'width=800,height=600');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  const handlePrintContract = (passenger: PackagePassenger) => {
      const client = clients.find(c => c.id === passenger.clientId);
      const pkg = travelPackages.find(p => p.id === passenger.packageId);
      if (!client || !pkg) return;

      const printContent = `
        <html><head><title>Contrato - ${client.name}</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 11px; padding: 30px; line-height: 1.3; text-align: justify; }
            h1 { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
            .box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
            .clause-title { font-weight: bold; margin-top: 10px; text-transform: uppercase; font-size: 11px; }
            .clause-text { margin-bottom: 5px; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
            .sig-line { border-top: 1px solid #000; width: 40%; padding-top: 5px; }
        </style>
        </head><body>
            <h1>CONTRATO DE ADESÃO</h1>
            <div style="border: 1px solid #000; padding: 5px; font-size: 10px; text-align: center; margin-bottom: 20px;">
                O ato de inscrição para participação programada de viagem ou excursão implica automaticamente na adesão do participante às "condições gerais" e às "condições especificadas" estabelecidas na forma abaixo.
            </div>

            <h2>VIAGENS RABELO TOUR PETRÓPOLIS S/C LTDA.<br/>EMBRATUR Nº 10.04828057000134</h2>

            <div class="box">
                <strong>CONTRATANTE (PASSAGEIRO):</strong> ${client.name}<br/>
                <strong>CPF:</strong> ${client.cpf} &nbsp;&nbsp; <strong>RG:</strong> ${client.rg || '___________'}<br/>
                <strong>ENDEREÇO:</strong> ${client.address || '____________________________________________________'}<br/>
                <strong>PACOTE:</strong> ${pkg.title} &nbsp;&nbsp; <strong>DATA:</strong> ${new Date(pkg.date).toLocaleDateString()}<br/>
                <strong>VALOR TOTAL:</strong> R$ ${passenger.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                ${passenger.saleType === 'AGENCY' ? `<br/><strong>AGÊNCIA:</strong> ${passenger.agencyName}` : ''}
            </div>

            <div class="clause-title">1-RESPONSABILIDADE</div>
            <div class="clause-text">A OPERADORA é responsável pelo planejamento, organização e execução da programação e, mesmo sendo intermediária entre o USUÁRIO e os demais prestadores de serviços envolvidos na mesma, pessoas físicas ou jurídicas, respondendo pela escolha, nos termos da Lei Civil e, no que couber, nos termos da Lei de Defesa do Consumidor. Conseqüentemente, não responde, nem se solidariza por quaisquer atos, fatos ou eventos, onde a responsabilidade local ou contratual das demais pessoas físicas ou jurídicas seja direta e específica, como no caso dos transportadores aéreos, terrestres, marítimos ou ferroviários e hoteleiros, que responderão na forma da lei.</div>

            <div class="clause-title">2-NOSSOS PREÇOS INCLUEM</div>
            <div class="clause-text">Todos os serviços especificados nos programas da RABELO TOUR com acompanhamento de guia.</div>

            <div class="clause-title">3-NOSSOS PREÇOS NÃO INCLUEM</div>
            <div class="clause-text">Despesas com documentação, taxa de turismo, bebidas, inclusive nas refeições; refeições a "la carte", lavanderia, telefonemas interurbanos, bem como outras despesa não prevista no programa, inclusive vôos, pernoites ou refeições que por motivos alheios à situação da OPERADORA, venham a ocorrer fora dos especificamente previstos.</div>

            <div class="clause-title">4-INSCRIÇÃO</div>
            <div class="clause-text">Será confirmada mediante pagamento de sinal determinado pela OPERADORA (consultar tabela de preços em vigor). O saldo deverá estar regularizado até 10 (dez) dias úteis antes da saída da excursão internacional e América do Sul. Pagamentos fora destes prazos estarão sujeitos a reajuste. Pagamentos com cheques pré-datados que forem devolvidos ficará sob a responsabilidade do USUÁRIO, inclusive despesa extras: taxas de banco, honorários advocatício, cartório e etc.</div>

            <div class="clause-title">5-CANCELAMENTO</div>
            <div class="clause-text">Será aceito, com restituição da importância paga, quando formalizado até 15 dias úteis antes da partida da excursão internacional América do Sul e 10 dias úteis antes da excursão nacional. APÓS ESTE PRAZO, SERÃO DEVIDOS PELO COMPRADOR 20% DO VALOR DA EXCURSÃO. OCORRENDO NOS ÚLTIMOS TRÊS DIAS ÚTEIS ANTES DA SAÍDA, SERÃO DEVIDOS 50% DO VALOR DA EXCURSÃO, INDEPENDENTE DA APRESENTAÇÃO DE ATESTADOS MÉDICOS, CASO A EMPRESA CONSIGA REVENDER O LUGAR, INDEPENDENTE DA DATA DO CANCELAMENTO, HAVERÁ RESTITUIÇÃO INTEGRAL DA IMPORTÂNCIA PAGA.</div>

            <div class="clause-title">6-TRANSFERÊNCIA</div>
            <div class="clause-text">Será aceita desde que o passageiro indique outra pessoa para viajar em seu lugar (até 15 dias úteis antes da excursão internacional América do Sul e 10 dias úteis antes da partida da excursão nacional), caso contrário, será considerada desistência e terá o mesmo tratamento dado ao cancelamento. (item 5)</div>

            <div class="clause-title">7-ABANDONO</div>
            <div class="clause-text">O passageiro que abandonar a viagem, ou parte dela após a mesma haver sido iniciada, não terá direito a reembolso.</div>

            <div class="clause-title">8-DESLIGAMENTO</div>
            <div class="clause-text">A Operadora reserva-se o direito de desligar do grupo o passageiro que venha prejudicar a excursão.</div>

            <div class="clause-title">9-TAXA CAMBIAL E PAGAMENTO</div>
            <div class="clause-text">Os cálculos para conversão em reais dos preços das excursões internacionais América do Sul, serão pelo valor do dólar turismo. Obs: Na compra através do Agente de Viagens as garantias acima apenas serão válidas caso o pagamento tenha sido enviado a RABELO TOUR, em tempo hábil, por Ordem Bancária.</div>

            <div class="clause-title">10-TRANSPORTE</div>
            <div class="clause-text">a) A RABELO TOUR freta ônibus de empresas selecionadas, estes ônibus possuem equipamentos de última geração, ar condicionado, sanitário químico, frigobar, poltronas reclináveis, janelas panorâmicas e sistema de som.<br/>b) Para roteiros com trajetos rodoviários de curta duração, translados, city tour, e outros serviços poderão ser realizados em veículos menores tipo: van, micro ônibus e ônibus sem ar condicionado.</div>

            <div class="clause-title">11-HOTELARIA</div>
            <div class="clause-text">a) A RABELO TOUR, utiliza hotéis padrão 3, 4 e 5 estrelas, não sendo possível a hospedagem nos hotéis normalmente utilizados pela RABELO TOUR, por estarem sem disponibilidade ou terem sofrido quedas no padrão de serviço, estes serão substituídos por outros hotéis da mesma classificação. Em caso de ser só possível, por razões de força maior, a obtenção de hotéis de classificação inferior, o cliente será reembolsado pela diferença do preço entre o hotel previsto no programa e o hotel utilizado.<br/>b) Circunstâncias alheias a nossa vontade, como quebra de contrato e desacordo sobre tarifas ou qualidade na prestação de serviços, poderão ocorrer, ocasionando a substituição dos hotéis mencionados.<br/>c) A hospedagem nas excursões é prevista em apartamentos duplos. O passageiro já inscrito que não puder ser acomodado em apartamentos com outra pessoa, será alojado individual, pagando 70% (setenta por cento) da diferença correspondente (individual bonificado), a qual será cobrado pela operadora três dias antes da partida.<br/>d) O apartamento triplo é formado por uma cama adicional, nem sempre do mesmo padrão estabelecido para o apartamento duplo. A Operadora não se responsabiliza por eventuais problemas causados por este tipo de acomodação quando solicitado pelo passageiro, não havendo, inclusive, implicação no preço pago pela excursão.<br/>e) As diárias dos hotéis iniciam-se às 12:00 h do dia da chegada do hóspede e vencem às 12:00 h do dia de sua partida (horário máximo para a desocupação do apartamento).</div>

            <div class="clause-title">12-BAGAGEM PERMITIDA</div>
            <div class="clause-text">a) Será permitido o transporte de uma mala por passageiro, cujas medidas não ultrapassem 70 x 50 x 20 centímetros.<br/>b) Os passageiros terão direito, ainda, de transportar consigo 1 (um) pequeno volume de mão (tipo bolsa RABELO TOUR), o qual deverá estar sempre em seu poder.<br/>c) Aos Srs. Passageiros é facultado o uso do porta bagagens do ônibus exclusivamente para transportar objetos que possam ser acondicionados em sua mala (BAGAGEM PERMITIDA);<br/>d) O extravio comprovado de malas com etiquetas RABELO TOUR transportada nos traslados e viagens terrestres, desde que considerada bagagem permitida, será ressarcido desde que comprovada a falha da Operadora, como instituem os Arts. 90 a 98 do Decreto Federal nº 92.353, que regulamenta os Transportes Rodoviários Interestaduais e Internacionais de Passageiros, cujo valor máximo não ultrapassará a 5 (cinco) salários mínimos;<br/>e) Dinheiro, jóias ou qualquer objeto de valor (não componente de vestuário), não devem ser transportados nas malas, pois não estão amparados pelo Decreto Federal nº 92.353.</div>

            <div class="clause-title">13-DOCUMENTOS DE VIAGEM</div>
            <div class="clause-text">Indispensável portarem Carteira de Identidade de órgão de Segurança Pública (Félix Pacheco, Pedro Mello, etc.) ou Passaporte atualizado. Qualquer outro tipo de Carteira de Identidade (Militar, OAB, CRM, Pereira Faustino, etc.), não é aceita para finalidade de viagem internacional. Carteiras de Identidade em mau estado de conservação, com rasura, não plastificada, bem como as de modelo antigo (com foto desatualizada) e xerox não são válidas.<br/>- MENORES DE 21 ANOS – Devem portar Carteira de Identidade (dentro dos requisitos especificados acima) ou Passaporte atualizado, e autorização do Juizado de Menores se desacompanhados de um dos genitores, ou de ambos, ou havendo discordância entre eles sobre o consentimento da viagem, conforme Artigo 2º, Portaria 13/95.<br/>- ESTRANGEIROS RESIDENTES NO BRASIL (INCLUSIVE COM DULA NACIONALIDADE) E TURISTAS EM TRÂNSITO – Passaporte, com vistos dos países a serem visitados, acompanhado da Célula de Identidade de Estrangeiro.<br/>A FALTA DE DOCUMENTAÇÃO ADEQUADA EXIME A RABELO TOUR DE QUALQUER RESPONSABILIDADE, INCLUSIVE REEMBOLSO.</div>

            <div class="clause-title">14-IMPORTANTE</div>
            <div class="clause-text">a) Para o correto andamento da excursão, ou por motivos técnicos, a ordem do programa poderá ser invertida ou alterada, sem prejuízo de total cumprimento da programação;<br/>b) A interrupção do tráfego nas estradas normalmente nos programas exime a RABELO TOUR de responsabilidade pela continuação da viagem. Pernoites e refeições que excedem ao total programado, bem como viagem(ns) por avião que resulte(m) desta interrupção, serão pagos diretamente pelos passageiros aos Hotéis, Restaurantes e Cias. Aéreas, não cabendo qualquer reembolso por parte da RABELO TOUR.;<br/>c) A Empresa garante a realização das excursões programadas desde que consiga a inscrição de, no mínimo, 25 passageiros. Caso este número mínimo não seja alcançado até 5 (cinco) dias antes da viagem, a mesma será cancelada, sendo o cliente imediatamente ressarcido com o valor total pago.</div>

            <div class="clause-title">15-RECLAMÇÕES</div>
            <div class="clause-text">No caso de reclamações quanto à prestação de serviço, o USUÁRIO as encaminhará por escrito ao Operador, em 30 dias após o encerramento dos serviços, conforme Artigo 26, item I, Parágrafo 1º do Código de Defesa do Consumidor. Senão o fizer, após este prazo a relação contratual será considerada perfeita e acabada, desobrigando o Operador de qualquer responsabilidade, salvo quanto a eventuais danos. A arbitragem, de comum acordo, poderá ser adotada para dirimir quaisquer dúvidas pendentes da aplicação do presente contrato. Nenhuma reclamação será considerada caso o usuário, ao invés de utilizar quaisquer dos procedimentos legais previstos na Lei nº 8078/90, preferir o uso dos meio de comunicação, ocasionando publicidade negativa que produzirá à Operadora danos materiais, de responsabilidade do usuário.</div>

            <div class="clause-title">16-FORO DE ELEIÇÃO</div>
            <div class="clause-text">Para dirimir toda e qualquer dúvida proveniente da aplicação do presente contrato, por eleição, os USUÁRIOS escolhem o Foro da cidade do Rio de Janeiro, renunciando a todo e qualquer outro por mais privilegiados que sejam.</div>

            <div class="clause-title">17-CONCORDÂNCIA</div>
            <div class="clause-text">Ao participar de uma das excursões da RABELO TOUR, o USUÁRIO, por si, ou através da Agência de Viagens sua mandatária, declara conhecer, pelo que adere contratualmente, as CONDIÇÕES GERAIS e específicas para operação do programa adquirido, comprometendo-se, quando for o caso, por si e seus familiares.</div>

            <div style="margin-top: 30px;">Petrópolis, ${new Date().toLocaleDateString()}</div>

            <div class="signatures">
                <div class="sig-line">
                    Assinatura do Agente de Viagens Vendedor
                </div>
                <div class="sig-line">
                    <strong>${client.name}</strong><br/>
                    Assinatura do Cliente
                </div>
            </div>
            
            <script>window.print();</script>
        </body></html>
      `;
      const win = window.open('', '', 'width=800,height=600');
      if (win) { win.document.write(printContent); win.document.close(); }
  };

  if (selectedPackage) {
      // DETAILS VIEW
      const passengers = packagePassengers.filter(p => p.packageId === selectedPackage.id);
      const totalRevenuePotential = passengers.reduce((sum, p) => sum + p.agreedPrice, 0);
      const totalRevenueCollected = passengers.reduce((sum, p) => sum + p.paidAmount, 0);
      const totalCommission = passengers.reduce((sum, p) => sum + (p.commissionValue || 0), 0);

      // Calculations for the current form state (Preview)
      const currentTotal = (saleForm.qtdAdult * selectedPackage.adultPrice) + 
                           (saleForm.qtdChild * selectedPackage.childPrice) +
                           (saleForm.qtdSenior * selectedPackage.seniorPrice);
      const currentFinal = Math.max(0, currentTotal - saleForm.discount);
      const estimatedCommission = currentFinal * (saleForm.saleType === 'AGENCY' ? 0.12 : 0.01);

      return (
          <div className="space-y-6 animate-fade-in">
              <button 
                onClick={() => setSelectedPackage(null)}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium mb-4"
              >
                  &larr; Voltar para Pacotes
              </button>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-600 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <h2 className="text-3xl font-bold">{selectedPackage.title}</h2>
                          <p className="opacity-90 mt-1">📅 Saída: {new Date(selectedPackage.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right text-xs md:text-sm bg-white/10 p-3 rounded-lg backdrop-blur-sm space-y-1">
                          <p>Adulto: <span className="font-bold">R$ {selectedPackage.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                          <p>Criança: <span className="font-bold">R$ {selectedPackage.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                          <p>Melhor Idade: <span className="font-bold">R$ {selectedPackage.seniorPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                      </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                          <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                              Vendas Realizadas ({passengers.length})
                          </h3>
                          
                          {/* REGISTER SALE FORM */}
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8 shadow-sm">
                              <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Nova Venda / Reserva</h4>
                              <form onSubmit={handleRegisterSale}>
                                  
                                  {/* TYPE OF SALE SELECTION */}
                                  <div className="mb-4 bg-white p-3 rounded border border-slate-200">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Venda (Comissão)</label>
                                      <div className="flex gap-4">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                              <input 
                                                type="radio" name="saleType" value="DIRECT"
                                                checked={saleForm.saleType === 'DIRECT'}
                                                onChange={() => setSaleForm({...saleForm, saleType: 'DIRECT'})}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                              />
                                              <span className="text-sm font-medium">Venda Direta (1%)</span>
                                          </label>
                                          <label className="flex items-center gap-2 cursor-pointer">
                                              <input 
                                                type="radio" name="saleType" value="AGENCY"
                                                checked={saleForm.saleType === 'AGENCY'}
                                                onChange={() => setSaleForm({...saleForm, saleType: 'AGENCY'})}
                                                className="text-emerald-600 focus:ring-emerald-500"
                                              />
                                              <span className="text-sm font-medium">Agência (12%)</span>
                                          </label>
                                      </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">CPF / CNPJ (Contratante)</label>
                                          <input 
                                            value={saleForm.cpf} onChange={e => setSaleForm({...saleForm, cpf: e.target.value})}
                                            onBlur={handleCpfBlur}
                                            className="w-full border p-2 rounded text-sm" placeholder="Documento" required
                                          />
                                      </div>
                                      <div className="md:col-span-2">
                                          <label className="text-xs font-bold text-slate-500">{saleForm.saleType === 'AGENCY' ? 'Nome do Contato na Agência' : 'Nome Completo Cliente'}</label>
                                          <input 
                                            value={saleForm.name} onChange={e => setSaleForm({...saleForm, name: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" required
                                          />
                                      </div>
                                      
                                      {/* AGENCY SPECIFIC FIELDS */}
                                      {saleForm.saleType === 'AGENCY' && (
                                          <>
                                              <div className="md:col-span-2">
                                                  <label className="text-xs font-bold text-slate-500">Nome da Agência</label>
                                                  <input 
                                                    value={saleForm.agencyName} onChange={e => setSaleForm({...saleForm, agencyName: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm" required
                                                  />
                                              </div>
                                              <div>
                                                  <label className="text-xs font-bold text-slate-500">Telefone Agência</label>
                                                  <input 
                                                    value={saleForm.agencyPhone} onChange={e => setSaleForm({...saleForm, agencyPhone: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm"
                                                  />
                                              </div>
                                              <div className="md:col-span-3">
                                                  <label className="text-xs font-bold text-slate-500">Lista de Passageiros (Nome e Telefone)</label>
                                                  <textarea 
                                                    value={saleForm.paxList} onChange={e => setSaleForm({...saleForm, paxList: e.target.value})}
                                                    className="w-full border p-2 rounded text-sm h-20"
                                                    placeholder="Ex: João Silva - (24) 99999-9999&#10;Maria Souza - (24) 88888-8888"
                                                  />
                                              </div>
                                          </>
                                      )}

                                      {/* COMMON FIELDS */}
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">RG (Responsável)</label>
                                          <input 
                                            value={saleForm.rg} onChange={e => setSaleForm({...saleForm, rg: e.target.value})}
                                            className="w-full border p-2 rounded text-sm"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">Data Nasc.</label>
                                          <input 
                                            type="date"
                                            value={saleForm.birthDate} onChange={e => setSaleForm({...saleForm, birthDate: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" required
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-slate-500">Telefone</label>
                                          <input 
                                            value={saleForm.phone} onChange={e => setSaleForm({...saleForm, phone: e.target.value})}
                                            className="w-full border p-2 rounded text-sm" placeholder="(00) 00000-0000"
                                          />
                                      </div>
                                      <div className="md:col-span-3">
                                          <label className="text-xs font-bold text-slate-500">Endereço Completo</label>
                                          <input 
                                            value={saleForm.address} onChange={e => setSaleForm({...saleForm, address: e.target.value})}
                                            className="w-full border p-2 rounded text-sm"
                                          />
                                      </div>
                                  </div>

                                  <div className="bg-white p-3 rounded border border-slate-200 mb-4">
                                      <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase">Quantidades e Valores</h5>
                                      <div className="grid grid-cols-3 gap-4 mb-3">
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Adultos</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdAdult} onChange={e => setSaleForm({...saleForm, qtdAdult: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Crianças</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdChild} onChange={e => setSaleForm({...saleForm, qtdChild: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                          <div className="text-center">
                                              <label className="block text-xs text-slate-500">Melhor Idade</label>
                                              <input type="number" min="0" className="border p-1 rounded w-full text-center" 
                                                value={saleForm.qtdSenior} onChange={e => setSaleForm({...saleForm, qtdSenior: parseInt(e.target.value) || 0})}
                                              />
                                          </div>
                                      </div>
                                      <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                                          <div className="flex flex-col">
                                              <label className="text-xs font-bold text-slate-500 mr-2">Desconto (R$)</label>
                                              <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500 w-32">
                                                  <span className="bg-slate-100 text-slate-600 px-2 py-1 font-bold border-r border-slate-300 text-xs">R$</span>
                                                  <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    className="p-1 outline-none text-right font-medium text-red-600 w-full" 
                                                    value={saleForm.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                    onChange={e => handleDiscountChange(e.target.value)}
                                                    placeholder="0,00"
                                                  />
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-xs text-slate-500 block">Total a Pagar</span>
                                              <span className="text-lg font-bold text-emerald-600">R$ {currentFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                              <span className="text-xs text-slate-400 block mt-1">Comissão Estimada: R$ {estimatedCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                          </div>
                                      </div>
                                  </div>

                                  <button type="submit" className="w-full bg-slate-800 text-white px-4 py-3 rounded font-bold text-sm hover:bg-slate-700 shadow-md">
                                      Registrar Venda
                                  </button>
                              </form>
                          </div>

                          {/* LIST OF SALES */}
                          <div className="space-y-3">
                              {passengers.map(p => {
                                  const progress = getPaymentProgress(p.paidAmount, p.agreedPrice);
                                  const client = clients.find(c => c.id === p.clientId);
                                  return (
                                      <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-lg hover:shadow-md transition-shadow relative">
                                          {p.saleType === 'AGENCY' && (
                                              <div className="absolute top-2 right-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase border border-purple-200">
                                                  Agência: {p.agencyName}
                                              </div>
                                          )}
                                          <div className="flex justify-between items-start mb-2">
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-bold text-slate-800 text-lg">{p.titularName}</span>
                                                      <button 
                                                        onClick={() => client && setViewHistoryClient(client)}
                                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                                                        title="Ver histórico de viagens"
                                                      >
                                                          📜 Histórico
                                                      </button>
                                                  </div>
                                                  <p className="text-xs text-slate-500">CPF: {p.titularCpf}</p>
                                                  <div className="mt-1 flex gap-2 text-xs font-medium text-slate-600">
                                                      {p.qtdAdult > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Adultos: {p.qtdAdult}</span>}
                                                      {p.qtdChild > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Crianças: {p.qtdChild}</span>}
                                                      {p.qtdSenior > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">Melhor Idade: {p.qtdSenior}</span>}
                                                  </div>
                                                  {p.paxList && (
                                                      <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                                          <strong>PAX Agência:</strong><br/>
                                                          {p.paxList}
                                                      </div>
                                                  )}
                                              </div>
                                              <div className="text-right mt-6">
                                                  <span className={`block text-xs font-bold mb-1 ${p.status === 'PAID' ? 'text-emerald-600' : p.status === 'PARTIAL' ? 'text-blue-600' : 'text-orange-500'}`}>
                                                      {p.status === 'PAID' ? 'QUITADO' : p.status === 'PARTIAL' ? 'PARCIAL' : 'PENDENTE'}
                                                  </span>
                                                  <p className="font-bold text-slate-800">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                                  {p.discount > 0 && <p className="text-xs text-red-500">- Desc: R$ {p.discount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>}
                                                  <p className="text-[10px] text-slate-400 mt-1">Comissão: R$ {p.commissionValue?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-4 mt-3">
                                              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                                                  <div className={`h-2.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${progress}%`}}></div>
                                              </div>
                                              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                                  Pago: R$ {p.paidAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                              </span>
                                          </div>
                                          
                                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                              <div className="flex gap-2">
                                                  <button 
                                                      onClick={() => handlePrintReceipt(p)}
                                                      className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded transition-colors"
                                                  >
                                                      🖨️ Recibo
                                                  </button>
                                                  <button 
                                                      onClick={() => handlePrintContract(p)}
                                                      className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded transition-colors"
                                                  >
                                                      📄 Contrato
                                                  </button>
                                              </div>

                                              {p.status !== 'PAID' && (
                                                  <button 
                                                      onClick={() => { setSelectedPassengerForPayment(p); setNewPayment({...newPayment, amount: p.agreedPrice - p.paidAmount}); }}
                                                      className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded hover:bg-emerald-700 font-medium"
                                                  >
                                                      Registrar Pagamento
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  )
                              })}
                              {passengers.length === 0 && <p className="text-slate-400 italic text-center py-4">Nenhuma venda registrada.</p>}
                          </div>
                      </div>

                      {/* SUMMARY PANEL */}
                      <div className="bg-slate-50 p-6 rounded-xl h-fit border border-slate-200">
                          <h3 className="font-bold text-slate-800 mb-4">Resumo do Pacote</h3>
                          <div className="space-y-4">
                              <div>
                                  <p className="text-sm text-slate-500">Valor Total Vendido</p>
                                  <p className="text-2xl font-bold text-slate-800">R$ {totalRevenuePotential.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500">Valor Recebido (Caixa)</p>
                                  <p className="text-2xl font-bold text-emerald-600">R$ {totalRevenueCollected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="border-t border-slate-200 pt-2">
                                  <p className="text-sm text-slate-500">Comissões a Pagar (Total)</p>
                                  <p className="text-xl font-bold text-purple-600">R$ {totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="pt-4 border-t border-slate-200">
                                  <p className="text-sm text-slate-500 mb-1">A Receber</p>
                                  <p className="text-xl font-bold text-red-500">R$ {(totalRevenuePotential - totalRevenueCollected).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* PAYMENT MODAL */}
              {selectedPassengerForPayment && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
                          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                              <h3 className="font-bold">Registrar Pagamento</h3>
                              <button onClick={() => setSelectedPassengerForPayment(null)} className="text-slate-400 hover:text-white">✕</button>
                          </div>
                          <div className="p-6">
                              <p className="text-sm text-slate-500 mb-1">Titular: <span className="font-bold text-slate-800">{selectedPassengerForPayment.titularName}</span></p>
                              <p className="text-sm text-slate-500 mb-4">Restante a Pagar: <span className="font-bold text-red-600">R$ {(selectedPassengerForPayment.agreedPrice - selectedPassengerForPayment.paidAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                              
                              <form onSubmit={handleRegisterPayment} className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                      <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                          <span className="bg-slate-100 text-slate-600 px-3 py-2 font-bold border-r border-slate-300">R$</span>
                                          <input 
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            value={newPayment.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                            onChange={e => handlePaymentAmountChange(e.target.value)}
                                            className="w-full p-2 outline-none text-right font-bold text-slate-800"
                                            placeholder="0,00"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                                      <input 
                                        type="date" required
                                        value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                                        className="w-full border p-2 rounded"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                                      <select 
                                        value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})}
                                        className="w-full border p-2 rounded"
                                      >
                                          <option value="PIX">Pix</option>
                                          <option value="DINHEIRO">Dinheiro (Espécie)</option>
                                          <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                          <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                      </select>
                                  </div>
                                  {newPayment.method === 'CARTAO_CREDITO' && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                                          <input 
                                            type="number" min="1" max="12"
                                            value={newPayment.installments} onChange={e => setNewPayment({...newPayment, installments: parseInt(e.target.value)})}
                                            className="w-full border p-2 rounded"
                                          />
                                      </div>
                                  )}
                                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded hover:bg-emerald-700 mt-2">
                                      Confirmar Recebimento
                                  </button>
                              </form>
                          </div>
                      </div>
                  </div>
              )}

              {/* CLIENT HISTORY MODAL */}
              {viewHistoryClient && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-bounce-in">
                          <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                              <h3 className="font-bold">Histórico: {viewHistoryClient.name}</h3>
                              <button onClick={() => setViewHistoryClient(null)} className="text-slate-400 hover:text-white">✕</button>
                          </div>
                          <div className="p-6">
                              <div className="mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                                  <p><strong>CPF:</strong> {viewHistoryClient.cpf}</p>
                                  <p><strong>Tel:</strong> {viewHistoryClient.phone}</p>
                                  <p><strong>Endereço:</strong> {viewHistoryClient.address}</p>
                              </div>
                              <h4 className="font-bold text-slate-700 mb-2 border-b pb-1">Viagens Realizadas</h4>
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                  {packagePassengers
                                    .filter(p => p.clientId === viewHistoryClient.id)
                                    .map(p => {
                                        const pkg = travelPackages.find(tp => tp.id === p.packageId);
                                        return (
                                            <div key={p.id} className="border border-slate-200 p-3 rounded hover:bg-slate-50">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-800">{pkg?.title}</span>
                                                    <span className="text-xs text-slate-500">{pkg ? new Date(pkg.date).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {p.qtdAdult} Ad, {p.qtdChild} Cri, {p.qtdSenior} Ido • Total: R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                                </p>
                                            </div>
                                        )
                                    })
                                  }
                                  {packagePassengers.filter(p => p.clientId === viewHistoryClient.id).length === 0 && (
                                      <p className="text-center text-slate-400 italic py-4">Nenhuma viagem anterior encontrada.</p>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // LIST VIEW
  return (
    <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Pacotes de Viagem</h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowCommissionReport(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-1"
                >
                    💰 Relatório de Comissões
                </button>
                <button 
                    onClick={() => setShowNewPackageForm(!showNewPackageForm)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                >
                    {showNewPackageForm ? 'Cancelar' : '+ Novo Pacote'}
                </button>
            </div>
        </div>

        {/* COMMISSION REPORT MODAL */}
        {showCommissionReport && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                    <div className="bg-purple-800 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg">Relatório de Comissões</h3>
                        <button onClick={() => setShowCommissionReport(false)} className="text-purple-200 hover:text-white text-xl">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                <p className="text-purple-800 text-xs font-bold uppercase">Total Comissões Geradas</p>
                                <p className="text-2xl font-bold text-purple-900">
                                    R$ {packagePassengers.reduce((sum, p) => sum + (p.commissionValue || 0), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                <p className="text-emerald-800 text-xs font-bold uppercase">Total em Vendas</p>
                                <p className="text-2xl font-bold text-emerald-900">
                                    R$ {packagePassengers.reduce((sum, p) => sum + p.agreedPrice, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </p>
                            </div>
                        </div>

                        <h4 className="font-bold text-slate-700 mb-2">Detalhamento por Venda</h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Cliente / Agência</th>
                                        <th className="p-3">Pacote</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3 text-right">Valor Venda</th>
                                        <th className="p-3 text-right">%</th>
                                        <th className="p-3 text-right">Comissão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {packagePassengers.map(p => {
                                        const pkg = travelPackages.find(tp => tp.id === p.packageId);
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <span className="font-medium text-slate-800">{p.titularName}</span>
                                                    {p.agencyName && <span className="block text-xs text-purple-600">{p.agencyName}</span>}
                                                </td>
                                                <td className="p-3 text-slate-600">{pkg?.title}</td>
                                                <td className="p-3">
                                                    {p.saleType === 'AGENCY' ? 
                                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Agência</span> : 
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">Direta</span>
                                                    }
                                                </td>
                                                <td className="p-3 text-right font-medium">R$ {p.agreedPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                <td className="p-3 text-right text-slate-500">{(p.commissionRate || 0) * 100}%</td>
                                                <td className="p-3 text-right font-bold text-green-600">R$ {(p.commissionValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                            </tr>
                                        );
                                    })}
                                    {packagePassengers.length === 0 && (
                                        <tr><td colSpan={6} className="p-6 text-center text-slate-400">Nenhuma venda com comissão registrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-right">
                        <button onClick={() => window.print()} className="text-sm bg-white border border-slate-300 px-3 py-2 rounded hover:bg-slate-100 mr-2">Imprimir Relatório</button>
                        <button onClick={() => setShowCommissionReport(false)} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 font-bold text-sm">Fechar</button>
                    </div>
                </div>
            </div>
        )}

        {showNewPackageForm && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                <h3 className="font-bold text-lg mb-4 text-slate-700">Criar Novo Pacote de Viagem</h3>
                <form onSubmit={handleCreatePackage} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pacote</label>
                            <input 
                                value={newPkg.title} onChange={e => setNewPkg({...newPkg, title: e.target.value})}
                                placeholder="Ex: Beto Carrero World" required
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data da Viagem</label>
                            <input 
                                type="date" value={newPkg.date} onChange={e => setNewPkg({...newPkg, date: e.target.value})}
                                required
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Adulto (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('adultPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Criança (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('childPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Melhor Idade (R$)</label>
                            <div className="flex items-center border border-slate-300 rounded overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="bg-slate-100 text-slate-600 px-2 py-2 font-bold border-r border-slate-300 text-xs">R$</span>
                                <input 
                                    type="text" 
                                    inputMode="numeric"
                                    required
                                    value={newPkg.seniorPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})} 
                                    onChange={e => handlePkgPriceChange('seniorPrice', e.target.value)}
                                    className="w-full p-2 outline-none text-right font-bold text-slate-800 text-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700">
                        Salvar Pacote
                    </button>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travelPackages.map(pkg => {
                const paxCount = packagePassengers.filter(p => p.packageId === pkg.id).length;
                return (
                    <div 
                        key={pkg.id} 
                        onClick={() => setSelectedPackage(pkg)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                    >
                        <div className="h-2 w-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors"></div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{pkg.title}</h3>
                            <p className="text-sm text-slate-500 mb-3">
                                📅 {new Date(pkg.date).toLocaleDateString()}
                            </p>
                            
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 mb-4">
                                <span className="bg-slate-100 px-2 py-1 rounded">Adulto: R$ {pkg.adultPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">Criança: R$ {pkg.childPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    {paxCount} Passageiros
                                </span>
                                <span className="text-slate-400 text-sm group-hover:translate-x-1 transition-transform">
                                    Gerenciar &rarr;
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
            {travelPackages.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                    <p>Nenhum pacote de viagem cadastrado.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default TravelPackagesView;
