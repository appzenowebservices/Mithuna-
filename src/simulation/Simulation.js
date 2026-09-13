class Simulation {

    constructor(){

        this.systems=[];

    }

    add(system){

        this.systems.push(system);

    }

    update(delta){

        for(const system of this.systems){

            system.update(delta);

        }

    }

}

export const simulation=new Simulation();