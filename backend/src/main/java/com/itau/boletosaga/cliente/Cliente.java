package com.itau.boletosaga.cliente;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.util.UUID;

// DECISAO: saldo real vs. saldo disponivel, dois campos separados - nao um so.
// PORQUE: e a mesma distincao que uma conta bancaria de verdade faz. Saldo
// REAL e o que a conta tem de fato, confirmado. Saldo DISPONIVEL e o que
// sobra depois de descontar reservas em andamento (pagamentos que comecaram
// mas ainda nao confirmaram). Consulta de saldo/extrato mostra disponivel
// (o cliente nao pode gastar o que ja esta reservado por outro pagamento em
// andamento); saldo real so muda quando um pagamento REALMENTE se completa.
@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private BigDecimal saldoReal;

    @Column(nullable = false)
    private BigDecimal saldoDisponivel;

    // DECISAO: @Version aqui tambem, mesmo motivo que em Saga.java.
    // PORQUE: existe uma corrida real possivel se duas sagas reservarem saldo
    // do mesmo cliente ao mesmo tempo (duas linhas do ContaSaldoListener
    // processando comandos concorrentes) - sem lock otimista, uma reserva
    // pode sobrescrever a outra silenciosamente.
    @Version
    private Long version;

    protected Cliente() {
    }

    public Cliente(UUID id, String nome, BigDecimal saldoInicial) {
        this.id = id;
        this.nome = nome;
        this.saldoReal = saldoInicial;
        this.saldoDisponivel = saldoInicial;
    }

    // DECISAO: SaldoInsuficienteException e regra de negocio DENTRO da
    // entidade, nao um "if" solto no listener que chama.
    // PORQUE: mesmo principio de "tell, don't ask" ja usado em
    // Saga.transicionarPara - a entidade se protege, nunca fica com
    // saldoDisponivel negativo por um chamador esquecer de checar antes.
    public void reservar(BigDecimal valor) {
        if (saldoDisponivel.compareTo(valor) < 0) {
            throw new SaldoInsuficienteException(saldoDisponivel, valor);
        }
        this.saldoDisponivel = this.saldoDisponivel.subtract(valor);
    }

    // DECISAO: liberarReserva (compensacao) so mexe no disponivel, nunca no real.
    // PORQUE: o real nunca foi debitado nessa reserva - so o disponivel tinha
    // sido descontado como "sinalizacao" de que esse dinheiro estava
    // comprometido. Compensar e simplesmente desfazer esse sinalizador.
    public void liberarReserva(BigDecimal valor) {
        this.saldoDisponivel = this.saldoDisponivel.add(valor);
    }

    // DECISAO: confirmarDebito so mexe no real, nunca no disponivel.
    // PORQUE: o disponivel ja tinha sido descontado no momento da RESERVA -
    // confirmar o debito so torna permanente o que ja estava sinalizado,
    // atualizando o saldo real pra bater com o disponivel.
    public void confirmarDebito(BigDecimal valor) {
        this.saldoReal = this.saldoReal.subtract(valor);
    }

    public void resetarSaldo(BigDecimal saldoInicial) {
        this.saldoReal = saldoInicial;
        this.saldoDisponivel = saldoInicial;
    }

    // DECISAO: deposito soma nos DOIS saldos (real e disponivel), ao mesmo
    // tempo.
    // PORQUE: diferente de reservar/liberar/confirmar (que so mexem em UM
    // saldo de cada vez, porque representam uma reserva em andamento),
    // deposito e dinheiro entrando de verdade, sem nenhuma reserva
    // envolvida - fica disponivel pra gastar E ja e real desde o primeiro
    // instante, nao existe uma "janela" intermediaria como no pagamento.
    public void depositar(BigDecimal valor) {
        if (valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor do deposito precisa ser maior que zero");
        }
        this.saldoReal = this.saldoReal.add(valor);
        this.saldoDisponivel = this.saldoDisponivel.add(valor);
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getSaldoReal() {
        return saldoReal;
    }

    public BigDecimal getSaldoDisponivel() {
        return saldoDisponivel;
    }
}
