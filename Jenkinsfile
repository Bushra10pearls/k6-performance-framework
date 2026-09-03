pipeline {
  agent any

  parameters {
    choice(name: 'ENVIRONMENT', choices: ['qa', 'dev'], description: 'Environment')
    booleanParam(name: 'RUN_STRESS', defaultValue: true, description: 'Run stress after load')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'chmod +x run.sh'
      }
    }

    stage('Load Test') {
      steps {
        sh './run.sh -e ${ENVIRONMENT} -s load -t sensor'
      }
    }

    stage('Stress Test') {
      when { expression { return params.RUN_STRESS } }
      steps {
        sh './run.sh -e ${ENVIRONMENT} -s stress -t sensor'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.json', allowEmptyArchive: true
    }
  }
}
