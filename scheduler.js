const reiniciar = document.getElementById("restart")

let processos = new Object()
let tickets_processos = new Array()
let tickets_total = 0

const tempo_processamento = 10

let processos_nucleo = new Object()
let tickets_nucleo = new Object()

let qtd_nucleos = document.getElementById('qtdNucleos').value
let processos_gerar = document.getElementById('qtdProcessos').value
let timeout = document.getElementById('timeout').value

let cancelar = false

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    qtd_nucleos = document.getElementById('qtdNucleos').value
    processos_gerar = document.getElementById('qtdProcessos').value
    timeout = document.getElementById('timeout').value

    const process_list = document.querySelector(".processList")

    for (let core = 0; core < qtd_nucleos; core += 1) {
        const coreDiv = document.createElement("h4")
        coreDiv.id = `core${core}`
        document.querySelector(".cores").appendChild(coreDiv)
    }

    function removeEmpty(array) {
        let newArray = []
        array.forEach(i => {
            if (i) {
                newArray.push(i)
            }
        })

        return newArray
    }

    async function atualizar_info(processos, tickets_total, tickets_atual) {
        const cores = document.querySelector(".cores").children

        const processing = new Array()
        for (x in cores) {

            if (!["length", "item", "namedItem"].includes(x)) {
                if (cores[x].innerHTML.split("ID")[1]) {
                    processing.push(parseInt(cores[x].innerHTML.split("ID")[1]))
                }
            }
        }

        let lastId = -1
        let count = 0
        processing.forEach(p => {
            if (p != lastId) {
                lastId = p
                count += 1
            }
        })

        document.getElementById("waitingProcesses").innerHTML = Object.keys(processos).length - count < 0 ? 0 + " de " + Object.keys(processos).length : Object.keys(processos).length - count + " de " + Object.keys(processos).length
        document.getElementById("totalTickets").innerHTML = tickets_total
        document.getElementById("ticketsNow").innerHTML = tickets_atual
    }

    async function exibir_processo(processos) {
        let process_list_html = ""

        for (id of Object.keys(processos)) {
            let processo = processos[id]

            let porcentagem = 100 * ((processo.duracao_original - processo.duracao) / processo.duracao_original)
            if (porcentagem > 100) { porcentagem = 100 }

            let color
            if (processo.status == "Executando") {
                color = "var(--highlight)"
            }
            else {
                color = "var(--text)"
            }

            process_list_html += `
        <div class="process">
            <h4>ID: ${String(processo.id).padStart(3, '0')}</h4>
            <h4>Execução restante: ${processo.duracao < 0 ? 0 : processo.duracao} Hz de ${processo.duracao_original} Hz</h4>
            <h4>Tickets: ${processo.tickets}</h4>
            <h4 style="color:${color};">Status: ${processo.status}</h4>
            
            <div class="barColor">
                <div class="progressBar" style="width: ${porcentagem}%;">${porcentagem.toFixed(2)}%</div>
            </div>
        </div>
        `
        }

        process_list.innerHTML = process_list_html
    }

    class Processo {
        constructor(id, duracao, tickets) {
            this.id = id
            this.duracao = duracao
            this.duracao_original = duracao
            this.tickets = tickets
            this.status = "Em espera"
            this.nucleo = "Fora"
        }

        async executar(tempo, nucleo) {
            this.duracao -= tempo
            this.status = "Executando"
            this.nucleo = nucleo
            await sleep(timeout)
        }

        pronto() {
            if (this.duracao <= 0) {
                this.status = "Pronto"
                this.nucleo = "Fora"
                return true
            }
            else {
                return false
            }
        }
    }

    function gerar_processos(qtd_processos) {
        for (let id = 1; id <= qtd_processos; id++) {
            const duracao_processo = Math.floor(Math.random() * 360) + 10;
            const tickets_processo = Math.floor(Math.random() * 10) + 1;
            tickets_total += tickets_processo
            processos[id] = new Processo(id, duracao_processo, tickets_processo)

            let added_tickets = 0
            while (tickets_processo > added_tickets) {
                tickets_processos.push(id)
                added_tickets += 1
            }
        }

        exibir_processo(processos)
    }

    async function lottery(nucleo) {
        while (removeEmpty(processos_nucleo[nucleo]).length > 0) {
            if (cancelar) { return }

            const nucleo_processos = removeEmpty(processos_nucleo[nucleo])
            const nucleo_tickets = tickets_nucleo[nucleo]

            let processo_sorteado = nucleo_tickets[Math.floor(Math.random() * nucleo_tickets.length)] // Sorteia um ticket aleatório

            nucleo_processos.forEach(processo => {
                if (processo.id == processo_sorteado) {
                    processo_sorteado = processo // Pega o processo referente aquele ticket
                }
            })

            if (!processo_sorteado.executar) {
                processo_sorteado = processos[processo_sorteado]
            }

            try { await processo_sorteado.executar(tempo_processamento, nucleo) } catch (err) { continue } // Executa o processo

            try { document.getElementById(`core${nucleo}`).innerHTML = `Núcleo ${nucleo}: ID ${String(processo_sorteado.id || 0).padStart(3, '0')}` } catch (err) { }

            processos[processo_sorteado.id] = processo_sorteado
            processos_nucleo[nucleo][processo_sorteado.id] = processo_sorteado
            exibir_processo(processos)

            processo_sorteado.status = "Em espera"
            processo_sorteado.nucleo = "Fora"

            processos[processo_sorteado.id] = processo_sorteado
            processos_nucleo[nucleo][processo_sorteado.id] = processo_sorteado

            atualizar_info(processos, tickets_total, tickets_processos.length)

            if (processo_sorteado.pronto()) { // Verifica se o processo foi executado completamente, se sim, remove o mesmo de todas as listas
                delete processos[processo_sorteado.id]
                delete processos_nucleo[nucleo][processo_sorteado.id]

                let i = tickets_processos.length;
                while (i--) {
                    if (tickets_processos[i] === processo_sorteado.id) {
                        tickets_processos.splice(tickets_processos.indexOf(processo_sorteado.id), 1);
                    }
                }

                let j = tickets_nucleo[nucleo].length;
                while (j--) {
                    if (tickets_nucleo[nucleo][j] === processo_sorteado.id) {
                        tickets_nucleo[nucleo].splice(tickets_nucleo[nucleo].indexOf(processo_sorteado.id), 1);
                    }
                }

                let p = processos_nucleo[nucleo].length;
                while (p--) {
                    if (processos_nucleo[nucleo][p] === processo_sorteado) {
                        processos_nucleo[nucleo].splice(processos_nucleo[nucleo].indexOf(processo_sorteado), 1);
                    }
                }
            }
        }

        document.getElementById(`core${nucleo}`).innerHTML = `Núcleo ${nucleo}: Vazio`

        if (!Object.keys(processos)[0]) {
            exibir_processo({})
            atualizar_info({}, tickets_total, 0)
        }
    }

    async function cpu(nucleos) {
        let count = 0
        let processos_array = Object.values(processos)
        for (let n = 0; n < nucleos; n++) {
            processos_nucleo[n] = []
            tickets_nucleo[n] = []

            let processos_div = Math.ceil(processos_array.length / nucleos)

            while (count < processos_array.length) {
                if (processos_nucleo[n].length < processos_div) {
                    processos_nucleo[n].push(processos_array[count])
                    lastIndex = count
                    count += 1
                }
                else {
                    break
                }
            }

            processos_nucleo[n].forEach(p => {
                for (let t = 0; t < p.tickets; t++) {
                    tickets_nucleo[n].push(p.id)
                }
            })

            lottery(n)
        }
    }

    gerar_processos(processos_gerar)
    cpu(qtd_nucleos)
}

reiniciar.addEventListener("click", async () => {
    cancelar = true
    processos = new Object()
    tickets_processos = new Array()
    processos_nucleo = new Object()
    tickets_nucleo = new Object()
    document.querySelector(`.cores`).innerHTML = ""

    await sleep(timeout)
    cancelar = false
    main()
})

main()
