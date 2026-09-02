// Jenkinsfile
// Runs the load profile first, then the stress profile.
// k6 exits 99 when a threshold is breached — that is what fails the build.

pipeline {
  agent any

  parameters {
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging'], description: 'Config file to load')
    choice(name: 'TEST', choices: ['all', 'login', 'posts', 'search'], description: 'Which test(s) to run')
    booleanParam(name: 'RUN_STRESS', defaultValue: true, description: 'Run the stress stage after the load stage')
  }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    K6_NO_COLOR = 'false'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        sh 'chmod +x run.sh'
      }
    }

    stage('Verify k6') {
      steps {
        sh '''
          if ! command -v k6 >/dev/null 2>&1; then
            echo "k6 not found on the agent. Installing to ./bin ..."
            mkdir -p bin
            curl -sL https://github.com/grafana/k6/releases/latest/download/k6-v0.49.0-linux-amd64.tar.gz \
              | tar xz --strip-components 1 -C bin k6-v0.49.0-linux-amd64/k6
            export PATH="$PWD/bin:$PATH"
          fi
          k6 version || ./bin/k6 version
        '''
      }
    }

    stage('Load Test') {
      steps {
        script {
          def code = sh(
            script: 'export PATH="$PWD/bin:$PATH"; ./run.sh -e ${ENVIRONMENT} -s load -t ${TEST}',
            returnStatus: true
          )
          if (code == 99) {
            error("Load test failed: a threshold was breached.")
          } else if (code != 0) {
            error("Load test errored with exit code ${code}.")
          }
          echo "Load test passed all thresholds."
        }
      }
    }

    stage('Stress Test') {
      when { expression { return params.RUN_STRESS } }
      steps {
        script {
          def code = sh(
            script: 'export PATH="$PWD/bin:$PATH"; ./run.sh -e ${ENVIRONMENT} -s stress -t ${TEST}',
            returnStatus: true
          )
          if (code == 99) {
            error("Stress test failed: error rate crossed 5% — see the console log for the VU level where it broke.")
          } else if (code != 0) {
            error("Stress test errored with exit code ${code}.")
          }
          echo "Stress test survived 100 VUs without breaching thresholds."
        }
      }
    }
  }

  post {
    always {
      // handleSummary() writes these even when a threshold breaks the build,
      // so the reports are always available for triage.
      archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.json',
                       allowEmptyArchive: true, fingerprint: true

      // Renders the k6-reporter dashboard on the build page.
      // Requires the "HTML Publisher" plugin — delete this block if it isn't installed.
      publishHTML(target: [
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports',
        reportFiles: '**/*.html',
        reportName: 'k6 Performance Report'
      ])
    }
    success {
      echo "BUILD PASSED — every threshold held on ${params.ENVIRONMENT}."
    }
    failure {
      echo "BUILD FAILED — a performance threshold was breached. Download the archived reports for detail."
    }
    cleanup {
      deleteDir()
    }
  }
}
